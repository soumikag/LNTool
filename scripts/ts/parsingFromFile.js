"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
var parsing_1 = require("./parsing");
var fs = require("fs");
var yargs = require("yargs");
var argv = yargs
    .command('print', "Parse and print the resulted JSON.", function (yargs) {
    return yargs
        .option('src', {
        describe: "A list of source files to parse and output",
    })
        .option('lib', {
        // alias: 'v',
        default: [],
    })
        .option('out', {
        describe: "If set, write the result json into the specified file instead of printing it.",
        default: null
    });
})
    .array("src")
    .array("lib")
    .argv;
var result = parsing_1.parseFiles(argv.src, argv.lib);
var json = JSON.stringify(result);
if (argv.out) {
    fs.writeFileSync(argv.out, json);
}
else {
    console.log(json);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2luZ0Zyb21GaWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGFyc2luZ0Zyb21GaWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXFDO0FBQ3JDLHFDQUFxQztBQUNyQyx1QkFBMEI7QUFFMUIsNkJBQThCO0FBRzlCLElBQUksSUFBSSxHQUFHLEtBQUs7S0FDYixPQUFPLENBQUMsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLFVBQUMsS0FBVztJQUNsRSxPQUFPLEtBQUs7U0FDVCxNQUFNLENBQUMsS0FBSyxFQUFFO1FBQ2IsUUFBUSxFQUFFLDRDQUE0QztLQUN2RCxDQUFDO1NBQ0QsTUFBTSxDQUFDLEtBQUssRUFBRTtRQUNiLGNBQWM7UUFDZCxPQUFPLEVBQUUsRUFBRTtLQUNaLENBQUM7U0FDRCxNQUFNLENBQUMsS0FBSyxFQUFDO1FBQ1osUUFBUSxFQUFFLCtFQUErRTtRQUN6RixPQUFPLEVBQUUsSUFBSTtLQUNkLENBQUMsQ0FBQTtBQUNOLENBQUMsQ0FBQztLQUNELEtBQUssQ0FBQyxLQUFLLENBQUM7S0FDWixLQUFLLENBQUMsS0FBSyxDQUFDO0tBQ1osSUFBSSxDQUFDO0FBRVIsSUFBSSxNQUFNLEdBQUcsb0JBQVUsQ0FBQyxJQUFJLENBQUMsR0FBZSxFQUFFLElBQUksQ0FBQyxHQUFlLENBQUMsQ0FBQztBQUNwRSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2xDLElBQUcsSUFBSSxDQUFDLEdBQUcsRUFBQztJQUNWLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQTtDQUMzQztLQUFJO0lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUNuQiJ9