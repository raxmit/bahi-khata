import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'An unexpected error occurred';
    const route = typeof request.route?.path === 'string'
      ? request.route.path
      : '<unmatched>';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          break;
        case 'P2003':
        case 'P2014':
        case 'P2034':
          status = HttpStatus.CONFLICT;
          message = 'The operation conflicts with an existing record or change';
          break;
        case 'P1001':
        case 'P1002':
        case 'P1008':
        case 'P1017':
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message = 'The persistence service is temporarily unavailable';
          this.logPersistenceFailure(request.method, route, exception.name, exception.code);
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        case 'P1018':
        case 'P2024':
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message = 'The persistence service is temporarily unavailable';
          this.logPersistenceFailure(request.method, route, exception.name, exception.code);
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database operation failed';
          this.logPersistenceFailure(request.method, route, exception.name, exception.code);
      }
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      const unavailableCodes = ['P1001', 'P1002', 'P1017'];
      if (exception.errorCode && unavailableCodes.includes(exception.errorCode)) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'The persistence service is temporarily unavailable';
      } else {
        message = 'Database operation failed';
      }
      this.logPersistenceFailure(
        request.method,
        route,
        exception.name,
        exception.errorCode ?? 'unknown',
      );
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
    } else {
      const errorName = exception instanceof Error ? exception.name : typeof exception;
      this.logger.error(`Unhandled exception ${request.method} ${route}: ${errorName}`);
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: route,
      timestamp: new Date().toISOString(),
    });
  }

  private logPersistenceFailure(
    method: string,
    route: string,
    errorName: string,
    code?: string,
  ): void {
    const codeDetail = code ? ` code=${code}` : '';
    this.logger.error(`Persistence failure ${method} ${route}: ${errorName}${codeDetail}`);
  }
}
