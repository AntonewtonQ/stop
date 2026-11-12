export class RoomRepositoryError extends Error {
  constructor(
    message: string,
    public status: number,
    public headers?: Record<string, string>,
  ) {
    super(message);
  }
}
