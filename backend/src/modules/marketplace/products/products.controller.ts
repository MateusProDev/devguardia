import {
  Controller, Get, Post, Put, Delete, Param, Body, Req, Query, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { ProductsService } from './products.service';
import { UpsertProductDto } from './dto/upsert-product.dto';
import { UpsertModuleDto } from './dto/upsert-module.dto';
import { UpsertLessonDto } from './dto/upsert-lesson.dto';
import { PublishProductDto } from './dto/publish-product.dto';

@Controller('marketplace/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── Marketplace público ─────────────────────────────────

  /** GET /marketplace/products?type=COURSE&q=termo&limit=20&offset=0 */
  @Get()
  @Throttle({ short: { ttl: 1000, limit: 30 } })
  async listPublic(
    @Query('type') type?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.productsService.listPublic({
      type,
      q,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /** GET /marketplace/products/by-slug/:slug — detalhe público */
  @Get('by-slug/:slug')
  @Throttle({ short: { ttl: 1000, limit: 30 } })
  async getPublicBySlug(@Param('slug') slug: string) {
    return this.productsService.getPublicBySlug(slug);
  }

  // ─── Painel do criador (autenticado) ─────────────────────

  /** GET /marketplace/products/me — lista produtos do criador */
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async listMine(@Req() req: any) {
    return this.productsService.listMine(req.user.id);
  }

  /** GET /marketplace/products/me/:id — detalhe completo (criador) */
  @Get('me/:id')
  @UseGuards(FirebaseAuthGuard)
  async getOwnDetail(@Req() req: any, @Param('id') id: string) {
    return this.productsService.getOwnDetail(req.user.id, id);
  }

  /** POST /marketplace/products/me — cria produto (DRAFT) */
  @Post('me')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 20 } })
  async create(@Req() req: any, @Body() dto: UpsertProductDto) {
    return this.productsService.create(req.user.id, dto);
  }

  /** PUT /marketplace/products/me/:id — atualiza produto */
  @Put('me/:id')
  @UseGuards(FirebaseAuthGuard)
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertProductDto) {
    return this.productsService.update(req.user.id, id, dto);
  }

  /** DELETE /marketplace/products/me/:id */
  @Delete('me/:id')
  @UseGuards(FirebaseAuthGuard)
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.productsService.remove(req.user.id, id);
  }

  /** POST /marketplace/products/me/:id/publish */
  @Post('me/:id/publish')
  @UseGuards(FirebaseAuthGuard)
  async setStatus(@Req() req: any, @Param('id') id: string, @Body() dto: PublishProductDto) {
    return this.productsService.setStatus(req.user.id, id, dto.publish);
  }

  // ─── Módulos ────────────────────────────────────────────

  @Post('me/:productId/modules')
  @UseGuards(FirebaseAuthGuard)
  async createModule(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() dto: UpsertModuleDto,
  ) {
    return this.productsService.createModule(req.user.id, productId, dto);
  }

  @Put('me/modules/:moduleId')
  @UseGuards(FirebaseAuthGuard)
  async updateModule(@Req() req: any, @Param('moduleId') moduleId: string, @Body() dto: UpsertModuleDto) {
    return this.productsService.updateModule(req.user.id, moduleId, dto);
  }

  @Delete('me/modules/:moduleId')
  @UseGuards(FirebaseAuthGuard)
  async removeModule(@Req() req: any, @Param('moduleId') moduleId: string) {
    return this.productsService.removeModule(req.user.id, moduleId);
  }

  // ─── Aulas ──────────────────────────────────────────────

  @Post('me/modules/:moduleId/lessons')
  @UseGuards(FirebaseAuthGuard)
  async createLesson(
    @Req() req: any,
    @Param('moduleId') moduleId: string,
    @Body() dto: UpsertLessonDto,
  ) {
    return this.productsService.createLesson(req.user.id, moduleId, dto);
  }

  @Put('me/lessons/:lessonId')
  @UseGuards(FirebaseAuthGuard)
  async updateLesson(@Req() req: any, @Param('lessonId') lessonId: string, @Body() dto: UpsertLessonDto) {
    return this.productsService.updateLesson(req.user.id, lessonId, dto);
  }

  @Delete('me/lessons/:lessonId')
  @UseGuards(FirebaseAuthGuard)
  async removeLesson(@Req() req: any, @Param('lessonId') lessonId: string) {
    return this.productsService.removeLesson(req.user.id, lessonId);
  }
}
