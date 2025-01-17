import { Request, Response, NextFunction } from "express";

/**
 * - `asyncHandler(fn)` wraps an asynchronous function `fn` (e.g., a route handler).
 * - Returns a function with `req`, `res`, and `next` parameters that executes `fn`.
 * - Ensures `fn` always returns a promise using `Promise.resolve()`,
 *   which acts as a safety mechanism to guarantee that whatever `fn` returns
 *   (whether it's a promise or not) is treated as a promise.
 * - If `fn` throws an error or returns a rejected promise, the error is caught
 *   and passed to the next middleware using `.catch(next)`.
 * - The returned function specifies `void` as its return type because Express middlewares don't return values directly; they rely on `next()`.
 */

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
