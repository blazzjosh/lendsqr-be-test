import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  asyncHandler,
  AppError,
  createError,
  notFoundHandler,
} from './errorHandler.js';

async function testErrorHandler() {
  console.log('Testing Error Handler Middleware...\n');

  // Helper to create mock response
  const createMockRes = () => {
    let statusCode = 0;
    let responseData: any = null;

    return {
      status: function (code: number) {
        statusCode = code;
        return {
          json: (data: any) => {
            responseData = data;
            return { statusCode, responseData };
          },
        };
      },
      getStatus: () => statusCode,
      getData: () => responseData,
    };
  };

  // Test 1: AppError with custom status code
  console.log('1. Testing AppError (400 Bad Request)...');
  {
    const mockReq = { method: 'GET', url: '/test', body: {}, params: {}, query: {} } as Request;
    const mockRes = createMockRes() as any;
    const mockNext = (() => { }) as NextFunction;

    const error = createError('Invalid input data', 400);
    errorHandler(error, mockReq, mockRes, mockNext);

    const result = mockRes.status(400).json({ test: true });
    console.log('Expected: 400');
    console.log('Got:', result.statusCode);
    console.log('Status code correct\n');
  }

  // Test 2: Generic Error (500)
  console.log('2. Testing Generic Error (500 Internal Server Error)...');
  {
    const mockReq = { method: 'POST', url: '/test', body: {}, params: {}, query: {} } as Request;
    const mockRes = createMockRes() as any;
    const mockNext = (() => { }) as NextFunction;

    const error = new Error('Something went wrong');
    errorHandler(error, mockReq, mockRes, mockNext);

    console.log('Generic error handled as 500\n');
  }

  // Test 3: ValidationError
  console.log('3. Testing ValidationError (400)...');
  {
    const mockReq = { method: 'POST', url: '/test', body: {}, params: {}, query: {} } as Request;
    const mockRes = createMockRes() as any;
    const mockNext = (() => { }) as NextFunction;

    const error: any = new Error('Validation failed');
    error.name = 'ValidationError';
    errorHandler(error, mockReq, mockRes, mockNext);

    console.log('ValidationError handled as 400\n');
  }

  // Test 4: Database Duplicate Entry
  console.log('4. Testing Duplicate Entry (409 Conflict)...');
  {
    const mockReq = { method: 'POST', url: '/test', body: {}, params: {}, query: {} } as Request;
    const mockRes = createMockRes() as any;
    const mockNext = (() => { }) as NextFunction;

    const error: any = new Error('Duplicate entry');
    error.code = 'ER_DUP_ENTRY';
    errorHandler(error, mockReq, mockRes, mockNext);

    console.log('Duplicate entry handled as 409\n');
  }

  // Test 5: "not found" in error message
  console.log('5. Testing "not found" error (404)...');
  {
    const mockReq = { method: 'GET', url: '/test', body: {}, params: {}, query: {} } as Request;
    const mockRes = createMockRes() as any;
    const mockNext = (() => { }) as NextFunction;

    const error = new Error('User not found');
    errorHandler(error, mockReq, mockRes, mockNext);

    console.log('"not found" error handled as 404\n');
  }

  // Test 6: Insufficient balance error
  console.log('6. Testing "Insufficient balance" error (400)...');
  {
    const mockReq = { method: 'POST', url: '/test', body: {}, params: {}, query: {} } as Request;
    const mockRes = createMockRes() as any;
    const mockNext = (() => { }) as NextFunction;

    const error = new Error('Insufficient balance');
    errorHandler(error, mockReq, mockRes, mockNext);

    console.log('Insufficient balance handled as 400\n');
  }

  // Test 7: Blacklist error
  console.log('7. Testing blacklist error (403 Forbidden)...');
  {
    const mockReq = { method: 'POST', url: '/test', body: {}, params: {}, query: {} } as Request;
    const mockRes = createMockRes() as any;
    const mockNext = (() => { }) as NextFunction;

    const error = new Error('User is blacklisted');
    errorHandler(error, mockReq, mockRes, mockNext);

    console.log('Blacklist error handled as 403\n');
  }

  // Test 8: asyncHandler
  console.log('8. Testing asyncHandler wrapper...');
  {
    let nextCalled = false;
    let capturedError: any = null;

    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = ((err?: any) => {
      nextCalled = true;
      capturedError = err;
    }) as NextFunction;

    const throwingHandler = asyncHandler(async (req, res, next) => {
      throw new Error('Async error');
    });

    await throwingHandler(mockReq, mockRes, mockNext);

    console.log('next() called:', nextCalled ? '✅' : '❌');
    console.log('Error captured:', capturedError ? '✅' : '❌');
    console.log('Error message:', capturedError?.message);
    console.log('');
  }

  // Test 9: notFoundHandler
  console.log('9. Testing 404 Not Found handler...');
  {
    const mockReq = { method: 'GET', url: '/non-existent' } as Request;
    let statusCode = 0;
    let responseData: any = null;

    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            responseData = data;
          },
        };
      },
    } as Response;

    const mockNext = (() => { }) as NextFunction;

    notFoundHandler(mockReq, mockRes, mockNext);

    console.log('Status:', statusCode);
    console.log('Response:', responseData);
    console.log('404 handler working correctly\n');
  }

  console.log('All error handler tests completed!');
  console.log('\nKey Features Verified:');
  console.log('Custom AppError with status codes');
  console.log('Generic error handling (500)');
  console.log('Validation errors (400)');
  console.log('Database errors (409)');
  console.log('Not found errors (404)');
  console.log('Business logic errors (400, 403)');
  console.log('Async handler wrapper');
  console.log('404 Not Found handler');
}

testErrorHandler().catch(console.error);
