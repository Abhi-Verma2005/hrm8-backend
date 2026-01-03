// Type definitions for Express Request extensions

declare global {
    namespace Express {
        interface Request {
            hrm8User?: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                role: string;
                licenseeId?: string;
            };
        }
    }
}

export { };
