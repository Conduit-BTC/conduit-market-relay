import { eventBus } from "@/events/eventBus.ts";

export class WebSocketRouter {
    constructor() {
        eventBus.subscribe('WS_MESSAGE', async (event) => {
            await this.route(event);
        })
    }

    async route(data: any) {
        console.log(data);
    }
}
