export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
