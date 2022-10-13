
import { parseFeed } from "https://deno.land/x/rss@0.5.6/mod.ts";
import { writeJsonSync } from "https://deno.land/x/jsonfile@1.0.0/mod.ts";
import { parse } from "https://deno.land/std@0.159.0/flags/mod.ts"
import * as Colors from "https://deno.land/std@0.159.0/fmt/colors.ts"
import { ensureFileSync } from "https://deno.land/std@0.159.0/fs/mod.ts";

const JSONFILE = "Data.json"
ensureFileSync(JSONFILE)

// It's the same as Feed but with new type definitions
interface CustomFeed {
    "atom:link": {
        rel: string;
        type: string;
        href: string;
    };
    type: string;
    id: string;
    title: {
        value: string;
        type: undefined;
    };
    generator: string;
    publishedRaw: string;
    createdRaw: string;
    updateDateRaw: string;
    docs: undefined;
    language: undefined;
    copyright: undefined;
    ttl: undefined;
    skipDays: undefined;
    skipHours: undefined;
    links: string[];
    entries: [{
        "threadmarks:likes": { value: string };
        "threadmarks:words": { value: string };
        "dc:creator": string[];
        "content:encoded": { value: string };
        "slash:comments": { value: string };
        id: string;
        title: { value: string, type: undefined };
        comments: undefined;
        publishedRaw: string;
        updatedRaw: string;
        content: { value: string };
        author: { email: undefined, name: string, uri: undefined };
        links: [],
        categories: [],
        contributors: undefined;
    }]
}

interface SanitisedCustomFeed {
    title: string;
    FeedLink: string;
    lastUpdate: {
        name: string;
        link: string;
    };
}

// Simple Functions

// Fetch Data
const fetchFeed = async (link: string): Promise<CustomFeed> => {
    const request = await fetch(link);
    const fechedRss = await request.text();
    const feed = await parseFeed(fechedRss) as unknown as CustomFeed;

    return feed
};

// Transform Data into Sanitize Data
const SanitizeFeed = (feed: CustomFeed): SanitisedCustomFeed => {
    const SanitizedFeedData: SanitisedCustomFeed = {
        title: feed.title.value,
        FeedLink: feed["atom:link"].href,
        lastUpdate: {
            name: feed.entries[0].title.value,
            link: feed.entries[0].id,
        }
    };

    return SanitizedFeedData
};

// get data from Data.Json
const fetchJsonDataParsed = (): SanitisedCustomFeed[] | string => {
    const data: SanitisedCustomFeed[] = [];

    const fileData = Deno.readTextFileSync(JSONFILE);
    if (fileData === "") return Colors.red("There are no feeds");

    const parseData = JSON.parse(fileData);
    for (const i in parseData) {
        data.push(parseData[i]);
    }

    return data
};

// composite functions
// add feed to Data.json
const addSanitizedFeedToJson = async (link: string): Promise<void> => {
    // check if link is good
    if (link.indexOf(".rss") === -1) return console.info(Colors.red("The link doesn't meet specifications"));

    const feeds: SanitisedCustomFeed[] = [];

    const feed: CustomFeed = await fetchFeed(link);
    const sanitizeFeed: SanitisedCustomFeed = SanitizeFeed(feed);

    const fetchJsonDataParsedd = fetchJsonDataParsed();
    if (typeof fetchJsonDataParsedd != "string") {
        for (const i in fetchJsonDataParsedd) {

            if (sanitizeFeed.title === fetchJsonDataParsedd[i].title) return console.info(Colors.red(sanitizeFeed.title + " is already on the list"));

            feeds.push(fetchJsonDataParsedd[i]);
        }
    }

    feeds.push(sanitizeFeed);

    writeJsonSync(JSONFILE, feeds, { spaces: 4 });

    console.info(Colors.green(sanitizeFeed.title + " has been added to the list"));
}

// list all feeds on Data.json
const listAll = (): void => {
    const fetchJsonDataParsedd: SanitisedCustomFeed[] | string = fetchJsonDataParsed();
    if (typeof fetchJsonDataParsedd === "string") return console.info(Colors.red("There is no feed on the list"));

    for (const i in fetchJsonDataParsedd) {
        console.log(i, "-:", Colors.green(fetchJsonDataParsedd[i].title))
    }
}

// Update all Feeds
const updateAll = async (): Promise<void> => {

    const updatedFeedsAndNotUpdatedfeeds: SanitisedCustomFeed[] = []

    const fetchJsonDataParsedd: SanitisedCustomFeed[] | string = fetchJsonDataParsed();
    if (typeof fetchJsonDataParsedd === "string") return console.info(Colors.red("There is no feed to update"));

    for (const i in fetchJsonDataParsedd) {
        const fetchedFeed = await fetchFeed(fetchJsonDataParsedd[i].FeedLink);

        if (fetchedFeed.entries[0].title.value === fetchJsonDataParsedd[i].lastUpdate.name) {
            updatedFeedsAndNotUpdatedfeeds.push(fetchJsonDataParsedd[i]);
            console.info(Colors.yellow(fetchJsonDataParsedd[i].title + " has no new update"));

        } else {

            const updatedFeed: SanitisedCustomFeed = SanitizeFeed(fetchedFeed);

            updatedFeedsAndNotUpdatedfeeds.push(updatedFeed);

            console.info(Colors.green(fetchJsonDataParsedd[i].title + " has been updated\n -:" + updatedFeed.lastUpdate.link));
        }
    }

    writeJsonSync(JSONFILE, updatedFeedsAndNotUpdatedfeeds, { spaces: 4 });
}

// delete a feed
const DelteFeed = (index: number): void => {
    const allFeeds: SanitisedCustomFeed[] | string = fetchJsonDataParsed();

    if (typeof allFeeds === "string") return console.log(Colors.red("There is no feed to delete"));
    if (allFeeds.length < index) return console.log(Colors.red("Index out of bound"));
    allFeeds.splice(index, 1)

    writeJsonSync(JSONFILE, allFeeds, { spaces: 4 });

    return console.info(Colors.green("Element Deleted Successfly"))
}

// deno-lint-ignore no-inferrable-types
const ALLCOMMANDS: string = `
    help    this will shouw you all the commands.
    add     -f add -l link
            This will add the Feed to the list
    update  -f update
            This will update all the feeds in the list
    list    -f list
            This will list all the feeds
    delete -f delete -i index
            This will delete element at the index shown in list
`

// Cli Tools
const Args = parse(Deno.args);
if (Args.f != undefined) Args.f = (Args.f).toLocaleLowerCase();

if (Args.f === "add") {
    addSanitizedFeedToJson(Args.l);
}

else if (Args.f === "update") {
    updateAll();
}

else if (Args.f === "list") {
    listAll();
}

else if (Args.f === "delete" && Args.i >= 0) {
    DelteFeed(Args.i);
}

else if (Args._ === ["help"] || Args._ === ["h"] || Args.f === "help" || Args.f === "h") {
    console.log(ALLCOMMANDS);
}

else {
    console.log("use -f help to show all current commands");
}