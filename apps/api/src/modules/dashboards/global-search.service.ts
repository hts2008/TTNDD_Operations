import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database';

/**
 * Global Search Service — T-0186
 *
 * Unified search across multiple entity types:
 * member, session, event, skill, asset, course, project.
 *
 * Uses Prisma `contains` (case-insensitive) for now;
 * can be upgraded to pg_trgm / full-text search when scale demands.
 */

export interface SearchResult {
  entityType: string;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  score: number;
}

@Injectable()
export class GlobalSearchService {
  private readonly logger = new Logger(GlobalSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(
    orgId: string,
    query: string,
    options?: { types?: string[]; limit?: number },
  ): Promise<{ results: SearchResult[]; total: number; query: string }> {
    const limit = options?.limit ?? 20;
    const types = options?.types ?? ['member', 'session', 'event', 'skill', 'asset', 'course', 'project'];

    const q = query.trim();
    if (!q) return { results: [], total: 0, query };

    const searches: Promise<SearchResult[]>[] = [];

    if (types.includes('member')) searches.push(this.searchMembers(orgId, q, limit));
    if (types.includes('session')) searches.push(this.searchSessions(orgId, q, limit));
    if (types.includes('event')) searches.push(this.searchEvents(orgId, q, limit));
    if (types.includes('skill')) searches.push(this.searchSkills(orgId, q, limit));
    if (types.includes('asset')) searches.push(this.searchAssets(orgId, q, limit));
    if (types.includes('course')) searches.push(this.searchCourses(orgId, q, limit));
    if (types.includes('project')) searches.push(this.searchProjects(orgId, q, limit));

    const allResults = (await Promise.all(searches)).flat();

    // Sort by relevance score descending, take top N
    allResults.sort((a, b) => b.score - a.score);
    const results = allResults.slice(0, limit);

    this.logger.debug(`Search "${q}" returned ${results.length}/${allResults.length} results`);
    return { results, total: allResults.length, query: q };
  }

  private async searchMembers(orgId: string, q: string, limit: number): Promise<SearchResult[]> {
    const members = await this.prisma.orgMember.findMany({
      where: {
        orgId,
        OR: [
          { scoutName: { contains: q, mode: 'insensitive' } },
          { heroName: { contains: q, mode: 'insensitive' } },
          { memberCode: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, scoutName: true, heroName: true, memberCode: true, role: true },
      take: limit,
    });

    return members.map((m) => ({
      entityType: 'member',
      id: m.id,
      title: m.scoutName ?? m.heroName ?? m.memberCode ?? 'Unknown',
      subtitle: `${m.role}${m.memberCode ? ` — ${m.memberCode}` : ''}`,
      url: `/members/${m.id}`,
      score: (m.scoutName?.toLowerCase().includes(q.toLowerCase()) ? 10 : 5),
    }));
  }

  private async searchSessions(orgId: string, q: string, limit: number): Promise<SearchResult[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        orgId,
        title: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, title: true, status: true, sessionDate: true },
      take: limit,
    });

    return sessions.map((s) => ({
      entityType: 'session',
      id: s.id,
      title: s.title,
      subtitle: `${s.status} — ${s.sessionDate?.toLocaleDateString() ?? ''}`,
      url: `/sessions/${s.id}`,
      score: s.title.toLowerCase().includes(q.toLowerCase()) ? 8 : 4,
    }));
  }

  private async searchEvents(orgId: string, q: string, limit: number): Promise<SearchResult[]> {
    const events = await this.prisma.event.findMany({
      where: {
        orgId,
        title: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, title: true, status: true, startDate: true },
      take: limit,
    });

    return events.map((e) => ({
      entityType: 'event',
      id: e.id,
      title: e.title,
      subtitle: `${e.status} — ${e.startDate?.toLocaleDateString() ?? ''}`,
      url: `/events/${e.id}`,
      score: e.title.toLowerCase().includes(q.toLowerCase()) ? 8 : 4,
    }));
  }

  private async searchSkills(orgId: string, q: string, limit: number): Promise<SearchResult[]> {
    const skills = await this.prisma.skill.findMany({
      where: {
        orgId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { skillCode: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, skillCode: true },
      take: limit,
    });

    return skills.map((s) => ({
      entityType: 'skill',
      id: s.id,
      title: s.name,
      subtitle: s.skillCode,
      url: `/skills/${s.id}`,
      score: s.name.toLowerCase().includes(q.toLowerCase()) ? 7 : 3,
    }));
  }

  private async searchAssets(orgId: string, q: string, limit: number): Promise<SearchResult[]> {
    const assets = await this.prisma.asset.findMany({
      where: {
        orgId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { assetCode: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, assetCode: true, status: true },
      take: limit,
    });

    return assets.map((a) => ({
      entityType: 'asset',
      id: a.id,
      title: a.name,
      subtitle: `${a.assetCode} — ${a.status}`,
      url: `/assets/${a.id}`,
      score: a.name.toLowerCase().includes(q.toLowerCase()) ? 7 : 3,
    }));
  }

  private async searchCourses(orgId: string, q: string, limit: number): Promise<SearchResult[]> {
    const courses = await this.prisma.course.findMany({
      where: {
        orgId,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, status: true },
      take: limit,
    });

    return courses.map((c) => ({
      entityType: 'course',
      id: c.id,
      title: c.title,
      subtitle: c.status,
      url: `/lms/courses/${c.id}`,
      score: c.title.toLowerCase().includes(q.toLowerCase()) ? 7 : 3,
    }));
  }

  private async searchProjects(orgId: string, q: string, limit: number): Promise<SearchResult[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        orgId,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true, status: true },
      take: limit,
    });

    return projects.map((p) => ({
      entityType: 'project',
      id: p.id,
      title: p.title,
      subtitle: p.status,
      url: `/projects/${p.id}`,
      score: p.title.toLowerCase().includes(q.toLowerCase()) ? 7 : 3,
    }));
  }
}
