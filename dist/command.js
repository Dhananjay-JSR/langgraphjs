"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLangGraphCommand = void 0;
const langgraph_1 = require("@langchain/langgraph");
const getLangGraphCommand = (command) => {
    let goto = command.goto != null && !Array.isArray(command.goto)
        ? [command.goto]
        : command.goto;
    return new langgraph_1.Command({
        goto: goto === null || goto === void 0 ? void 0 : goto.map((item) => {
            if (typeof item !== "string")
                return new langgraph_1.Send(item.node, item.input);
            return item;
        }),
        update: command.update,
        resume: command.resume,
    });
};
exports.getLangGraphCommand = getLangGraphCommand;
