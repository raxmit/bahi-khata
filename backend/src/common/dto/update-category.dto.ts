import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  @Matches(/\S/, { message: 'Category name must not be blank' })
  name: string;
}
