import {
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter persistence error contract', () => {
  const loggerError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  const filter = new AllExceptionsFilter();

  const respondTo = (
    exception: unknown,
    url = '/transactions?amount=999.99',
    route: { path: string } | null = { path: '/transactions' },
  ) => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const request = {
      method: 'POST',
      url,
      route,
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);
    return { status, json };
  };

  afterEach(() => {
    loggerError.mockClear();
  });

  it.each([
    ['P2002', 409, 'A record with this value already exists'],
    ['P2003', 409, 'The operation conflicts with an existing record or change'],
    ['P2014', 409, 'The operation conflicts with an existing record or change'],
    ['P2034', 409, 'The operation conflicts with an existing record or change'],
    ['P2025', 404, 'Record not found'],
    ['P1001', 503, 'The persistence service is temporarily unavailable'],
    ['P1002', 503, 'The persistence service is temporarily unavailable'],
    ['P1008', 503, 'The persistence service is temporarily unavailable'],
    ['P1017', 503, 'The persistence service is temporarily unavailable'],
    ['P1018', 503, 'The persistence service is temporarily unavailable'],
    ['P2024', 503, 'The persistence service is temporarily unavailable'],
    ['P9999', 500, 'Database operation failed'],
  ] as const)('maps Prisma %s to a safe %i response', (code, expectedStatus, expectedMessage) => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      'sensitive database detail: 123.45',
      { code, clientVersion: '5.22.0', meta: { note: 'private transaction note' } },
    );

    const { status, json } = respondTo(exception);

    expect(status).toHaveBeenCalledWith(expectedStatus);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: expectedStatus,
      message: expectedMessage,
      path: '/transactions',
    }));
    expect(JSON.stringify(json.mock.calls[0])).not.toContain('sensitive database detail');
    expect(JSON.stringify(json.mock.calls[0])).not.toContain('private transaction note');
    expect(JSON.stringify(json.mock.calls[0])).not.toContain('999.99');
  });

  it.each(['P1001', 'P1002', 'P1017'])(
    'maps Prisma initialization error %s to 503 and logs only safe diagnostic metadata',
    (errorCode) => {
      const exception = new Prisma.PrismaClientInitializationError(
        'sensitive connection detail with password=secret',
        '5.22.0',
        errorCode,
      );

      const { status, json } = respondTo(exception);

      expect(status).toHaveBeenCalledWith(503);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 503,
        message: 'The persistence service is temporarily unavailable',
        path: '/transactions',
      }));
      expect(loggerError).toHaveBeenCalledWith(expect.stringContaining(errorCode));
      expect(loggerError.mock.calls.flat().join(' ')).not.toContain('password=secret');
      expect(JSON.stringify(json.mock.calls[0])).not.toContain('password=secret');
    },
  );

  it('returns a generic 500 for unknown failures and logs type and route without exception data or URL query', () => {
    const exception = new Error('SQL password=secret and amount=123.45');

    const { status, json } = respondTo(exception);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 500,
      message: 'An unexpected error occurred',
      path: '/transactions',
    }));
    expect(loggerError).toHaveBeenCalledWith('Unhandled exception POST /transactions: Error');
    expect(loggerError.mock.calls.flat().join(' ')).not.toContain('password=secret');
    expect(loggerError.mock.calls.flat().join(' ')).not.toContain('123.45');
    expect(loggerError.mock.calls.flat().join(' ')).not.toContain('999.99');
    expect(JSON.stringify(json.mock.calls[0])).not.toContain('amount=999.99');
  });

  it('uses a generic route marker when no matched route exists', () => {
    const { json } = respondTo(new Error('unexpected'), '/private/value?note=sensitive', null);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ path: '<unmatched>' }));
  });
});
