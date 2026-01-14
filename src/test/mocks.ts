export const mockUser = {
    id: "test-user-123",
    username: "TestWarrior"
};

export const mockOptions = (args: Record<string, any> = {}) => ({
    getString: (key: string) => args[key],
    getInteger: (key: string) => args[key],
    getUser: (key: string) => ({ id: "target-user-456", username: "TargetDummy" }),
    getSubcommand: () => args['subcommand']
});

export const mockInteraction = (commandName: string, args: Record<string, any> = {}) => {
    return {
        commandName,
        user: mockUser,
        options: mockOptions(args),
        deferReply: async () => console.log(`[${commandName}] Deferring reply...`),
        editReply: async (content: any) => console.log(`[${commandName}] EditReply:`, JSON.stringify(content, null, 2)),
        reply: async (content: any) => console.log(`[${commandName}] Reply:`, JSON.stringify(content, null, 2)),
        followUp: async (content: any) => console.log(`[${commandName}] FollowUp:`, JSON.stringify(content, null, 2)),
        // Mocking the message for collector
        createMessageComponentCollector: () => ({
            on: (event: string, cb: Function) => console.log(`[${commandName}] Collector registered event: ${event}`),
            stop: () => console.log(`[${commandName}] Collector stopped`)
        })
    };
};
