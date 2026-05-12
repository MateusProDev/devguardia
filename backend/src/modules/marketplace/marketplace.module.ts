import { Module } from '@nestjs/common';
import { CreatorsModule } from './creators/creators.module';
import { ProductsModule } from './products/products.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ContributionsModule } from './contributions/contributions.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    CreatorsModule,
    ProductsModule,
    PurchasesModule,
    ContributionsModule,
    ReviewsModule,
  ],
})
export class MarketplaceModule {}
