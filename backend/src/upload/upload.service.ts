import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;

const IMAGE_MAGIC_NUMBERS: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

interface TokenData {
  filePath: string;
  expires: number;
  mimeType: string;
}

@Injectable()
export class UploadService {
  private uploadDir: string;
  private tokenStore: Map<string, TokenData> = new Map();

  constructor() {
    this.uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    this.ensureUploadDir();
    this.startTokenCleanup();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private startTokenCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [token, data] of this.tokenStore.entries()) {
        if (data.expires < now) {
          this.tokenStore.delete(token);
        }
      }
    }, 60000);
  }

  private validateImageFile(filePath: string): boolean {
    try {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      let mimeType: string | undefined;
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';

      if (!mimeType) return false;

      const magicNumbers = IMAGE_MAGIC_NUMBERS[mimeType];
      if (!magicNumbers) return false;

      if (mimeType === 'image/webp') {
        if (buffer.length < 12) return false;
        const riffHeader = [0x52, 0x49, 0x46, 0x46];
        const webpFormat = [0x57, 0x45, 0x42, 0x50];
        for (let i = 0; i < 4; i++) {
          if (buffer[i] !== riffHeader[i]) return false;
        }
        for (let i = 0; i < 4; i++) {
          if (buffer[8 + i] !== webpFormat[i]) return false;
        }
        return true;
      }

      for (let i = 0; i < magicNumbers.length; i++) {
        if (buffer[i] !== magicNumbers[i]) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async uploadImage(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传图片文件');
    }

    if (file.size > IMAGE_MAX_SIZE) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException('图片大小不能超过 5MB');
    }

    if (!this.validateImageFile(file.path)) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException('图片文件格式无效');
    }

    const token = this.generateToken();
    const mimeType = file.mimetype;

    this.tokenStore.set(token, {
      filePath: file.path,
      expires: Date.now() + 24 * 60 * 60 * 1000,
      mimeType,
    });

    return {
      url: `/api/files/${token}`,
      token,
      filename: path.basename(file.path),
      size: file.size,
      mimeType,
    };
  }

  async uploadVideo(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传视频文件');
    }

    if (file.size > VIDEO_MAX_SIZE) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException('视频大小不能超过 50MB');
    }

    const token = this.generateToken();
    const mimeType = file.mimetype;

    this.tokenStore.set(token, {
      filePath: file.path,
      expires: Date.now() + 24 * 60 * 60 * 1000,
      mimeType,
    });

    return {
      url: `/api/files/${token}`,
      token,
      filename: path.basename(file.path),
      size: file.size,
      mimeType,
    };
  }

  getFileByToken(token: string): { stream: fs.ReadStream; mimeType: string; filePath: string } {
    const fileData = this.tokenStore.get(token);
    
    if (!fileData || fileData.expires < Date.now()) {
      throw new NotFoundException('文件不存在或链接已过期');
    }

    if (!fs.existsSync(fileData.filePath)) {
      throw new NotFoundException('文件不存在');
    }

    const stream = fs.createReadStream(fileData.filePath);
    return {
      stream,
      mimeType: fileData.mimeType,
      filePath: fileData.filePath,
    };
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  getImageMaxSize() {
    return IMAGE_MAX_SIZE;
  }

  getVideoMaxSize() {
    return VIDEO_MAX_SIZE;
  }
}
