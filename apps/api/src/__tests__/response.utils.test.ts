import { ok, badRequest } from '../utils/response';
import { Response } from 'express';

describe('Response Utilities', () => {
  let mockRes: Partial<Response>;
  let resJson: jest.Mock;
  let resStatus: jest.Mock;

  beforeEach(() => {
    resJson = jest.fn();
    resStatus = jest.fn().mockReturnValue({ json: resJson });
    mockRes = {
      status: resStatus,
      json: resJson,
    };
  });

  it('should format success response correctly', () => {
    const data = { id: 1, name: 'Test' };
    ok(mockRes as Response, data, 'Success');
    
    expect(resStatus).toHaveBeenCalledWith(200);
    expect(resJson).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data,
    });
  });

  it('should format error response correctly', () => {
    badRequest(mockRes as Response, 'Not Found');
    
    expect(resStatus).toHaveBeenCalledWith(400);
    expect(resJson).toHaveBeenCalledWith({
      success: false,
      message: 'Not Found',
    });
  });
});
