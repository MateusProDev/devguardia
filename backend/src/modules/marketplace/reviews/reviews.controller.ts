import {
  Controller, Get, Put, Delete, Param, Body, Query, Req, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../../../common/guards/firebase-auth.guard';
import { ReviewsService } from './reviews.service';
import { UpsertReviewDto } from './dto/upsert-review.dto';

@Controller('marketplace/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** GET /marketplace/reviews/:productId */
  @Get(':productId')
  @Throttle({ short: { ttl: 1000, limit: 30 } })
  async list(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reviewsService.listByProduct(
      productId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  /** PUT /marketplace/reviews/:productId — cria/atualiza review */
  @Put(':productId')
  @UseGuards(FirebaseAuthGuard)
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  async upsert(@Req() req: any, @Param('productId') productId: string, @Body() dto: UpsertReviewDto) {
    return this.reviewsService.upsert(req.user.id, productId, dto);
  }

  /** DELETE /marketplace/reviews/:productId */
  @Delete(':productId')
  @UseGuards(FirebaseAuthGuard)
  async remove(@Req() req: any, @Param('productId') productId: string) {
    return this.reviewsService.remove(req.user.id, productId);
  }
}
