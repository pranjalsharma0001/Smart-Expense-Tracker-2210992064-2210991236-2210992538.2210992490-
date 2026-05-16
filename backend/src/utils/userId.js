import mongoose from 'mongoose';

/** JWT `sub` is a string; MongoDB stores `userId` as ObjectId — always cast for consistent matches. */
export function reqUserObjectId(req) {
  return new mongoose.Types.ObjectId(req.userId);
}
