export function isValidJsonString(arg: unknown): boolean {
    try {
        JSON.parse(arg as string);
        return true;
    } catch (_) {
        return false;
    }
}
