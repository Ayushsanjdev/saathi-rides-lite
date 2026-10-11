import { bookingSchema, type DepartureDTO } from "@saathi/contracts";
import type { z } from "zod";
export type BookingIntent = {
  body: z.infer<typeof bookingSchema>;
  departure: DepartureDTO;
};
type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
export class BookingIntents {
  constructor(
    private storage: Storage,
    private uuid: () => string,
  ) {}
  private key(userId: string) {
    return `saathi.booking-intent.${userId}`;
  }
  async read(userId: string): Promise<BookingIntent | null> {
    const raw = await this.storage.getItem(this.key(userId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const body = bookingSchema.parse(parsed.body);
      if (parsed.departure?.id !== body.departureId)
        throw new Error("Invalid draft");
      return { body, departure: parsed.departure };
    } catch {
      await this.clear(userId);
      return null;
    }
  }
  async create(
    userId: string,
    departure: DepartureDTO,
    seats: number,
    contactPhone: string,
  ) {
    if (await this.read(userId))
      throw new Error(
        "Resolve your previous booking before choosing another ride.",
      );
    const intent = {
      body: bookingSchema.parse({
        departureId: departure.id,
        seats,
        contactPhone,
        idempotencyKey: this.uuid(),
      }),
      departure,
    };
    await this.storage.setItem(this.key(userId), JSON.stringify(intent));
    return intent;
  }
  clear(userId: string) {
    return this.storage.removeItem(this.key(userId));
  }
}
