import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  FileStorageService,
  CreateUploadRequestDto,
  FinalizeUploadDto,
} from './file-storage.service';
import { CurrentUser, OrgId } from '../../common/decorators';
import { AuthGuard, Public } from '../../core/auth';

@ApiTags('FileStorage')
@ApiBearerAuth()
@Controller('file-storage')
@UseGuards(AuthGuard)
export class FileStorageController {
  constructor(private readonly service: FileStorageService) {}

  @Put('local-upload/:encodedKey')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Local development signed URL upload target' })
  async acceptLocalUpload(@Param('encodedKey') encodedKey: string, @Req() req: Request) {
    await this.service.acceptLocalUpload(encodedKey, req, req.headers['content-type']);
  }

  @Get('local-download/:encodedKey')
  @Public()
  @ApiOperation({ summary: 'Local development signed URL download target' })
  async getLocalDownload(@Param('encodedKey') encodedKey: string, @Res() res: Response) {
    const object = await this.service.getLocalObject(encodedKey);
    res.setHeader('Content-Type', object.mimeType);
    res.setHeader('Content-Length', String(object.buffer.length));
    res.setHeader('X-TTNDD-Object-Key', object.objectKey);
    return res.send(object.buffer);
  }

  @Post('upload-request')
  @ApiOperation({ summary: 'Request a signed URL to upload a file to GCS' })
  async requestUpload(
    @OrgId() orgId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: CreateUploadRequestDto,
  ) {
    return this.service.createUploadRequest(orgId, userId, body);
  }

  @Post('finalize')
  @ApiOperation({ summary: 'Finalize an uploaded file reference after storage upload completes' })
  async finalizeUpload(
    @OrgId() orgId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: FinalizeUploadDto,
  ) {
    return this.service.finalizeUpload(orgId, userId, body);
  }

  @Get(':fileRefId/download-url')
  @ApiOperation({ summary: 'Get a signed URL to download a file' })
  async getDownloadUrl(@OrgId() orgId: string, @Param('fileRefId') fileRefId: string) {
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
  async deleteFile(@OrgId() orgId: string, @Param('fileRefId') fileRefId: string) {
    await this.service.softDelete(orgId, fileRefId);
  }
}
