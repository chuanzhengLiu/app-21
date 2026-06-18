import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Param,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;

const imageFileFilter = (req: any, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
    return cb(new BadRequestException('仅支持 jpg、png、gif、webp 格式的图片'), false);
  }
  cb(null, true);
};

const videoFileFilter = (req: any, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
  const allowedMimeTypes = ['video/mp4', 'video/webm'];
  const allowedExtensions = ['.mp4', '.webm'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
    return cb(new BadRequestException('仅支持 mp4、webm 格式的视频'), false);
  }
  cb(null, true);
};

const getStorage = (subDir: string) => {
  return diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
      const targetDir = path.join(uploadDir, subDir);
      const fs = require('fs');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${uuidv4()}${ext}`;
      cb(null, uniqueName);
    },
  });
};

@Controller()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: getStorage('images'),
    fileFilter: imageFileFilter,
    limits: { fileSize: IMAGE_MAX_SIZE },
  }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImage(file);
  }

  @Post('upload/video')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: getStorage('videos'),
    fileFilter: videoFileFilter,
    limits: { fileSize: VIDEO_MAX_SIZE },
  }))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadVideo(file);
  }

  @Get('/files/:token')
  async getFile(@Param('token') token: string, @Res() res: Response) {
    try {
      const { stream, mimeType } = this.uploadService.getFileByToken(token);
      res.setHeader('Content-Type', mimeType);
      stream.pipe(res);
    } catch (error) {
      res.status(404).json({ message: '文件不存在或链接已过期' });
    }
  }
}
