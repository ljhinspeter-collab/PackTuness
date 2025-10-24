class MythicSerialService {
  private mythicCounts: Record<string, number>;

  constructor() {
    this.mythicCounts = {};
  }

  getNextSerialNumber(songId: string): number {
    const currentCount = this.mythicCounts[songId] || 0;
    const nextSerialNumber = currentCount + 1;
    this.mythicCounts[songId] = nextSerialNumber;
    return nextSerialNumber;
  }

  // Optional: Method to reset counts if needed for debugging or new sessions
  reset() {
    this.mythicCounts = {};
  }
}

// Export a singleton instance of the service
export const mythicSerialService = new MythicSerialService();
