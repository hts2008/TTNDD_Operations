import {
  Controller, Get, Post, Delete,
  Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileStorageService, CreateUploadRequestDto } from './file-storage.service';
import { CurrentUser, OrgId } from '../../common/decorators';
import { AuthGuard } from '../../core/auth';

@ApiTags('FileStorage')
@ApiBearerAuth()
@Controller('file-storage')
@UseGuards(AuthGuard)
export class FileStorageController {
  constructor(private readonly service: FileStorageService) {}

  @Post('upload-request')
  @ApiOperation({ summary: 'Request a signed URL to upload a file to GCS' })
  async requestUpload(
    @OrgId() orgId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: CreateUploadRequestDto,
  ) {
    return this.service.createUploadRequest(orgId, userId, body);
  }

  @Get(':fileRefId/download-url')
  @ApiOperation({ summary: 'Get a signed URL to download a file' })
  async getDownloadUrl(
    @OrgId() orgId: string,
    @Param('fileRefId') fileRefId: string,
  ) {
    return this.service.getDownloadUrl(orgId, fileRefId);
  }

  @Get()
  @ApiOperation({ summary: 'List files for the org, optionally filtered by entity' })
  async listFiles(
    @OrgId() orgId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.service.listFiles(orgId, entityType, entityId);
  }

  @Delete(':fileRefId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a file reference' })
  async deleteFile(
    @OrgId() orgId: string,
    @Param('fileRefId') fileRefId: string,
  ) {
    await this.service.softDelete(orgId, fileRefId);
  }
}
