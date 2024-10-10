type Event = {
    message: string;
};

export async function main(event: Event) {
    return {
      message: `SUCCESS with message ${event.message} 🎉`
    };
  }