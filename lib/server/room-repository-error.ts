export class RoomRepositoryError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
