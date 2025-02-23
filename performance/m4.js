#!/usr/bin/env node
const distribution = require("../config.js");
const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
let data = new Map();
let gid = "test"

let localServer;
distribution.node.start((server) => {
  localServer = server;
});


function generateString() {
    let result = ' ';
    length = Math.floor(Math.random() * 20);
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

function generateData() {
    for (let i = 0; i < 1000; i++) {
        let randomKey = generateString();
        let randomValue = generateString();
        data.set(randomKey, randomValue);
  }
}

function insertData() {
    let throughputStart = Date.now();
    let count = 0;
    for (let [key, value] of data) {

        global.distribution[gid].mem.put(value, key, (err, res) => {
            count++;
            if (count === 1000) {
                let throughputEnd = Date.now();
                let latency = (throughputEnd - throughputStart) / 1000;
                console.log(`Average Put Latency: ${latency} ms`);
                console.log(`Put Throughput: ${(1000 * 1) / latency} requests/second`);
        }
            
        });
    }
}

function queryData() {
    let throughputStart = Date.now();
    let count = 0;
    for (let [key, value] of data) {
        global.distribution[gid].mem.get(key, (err, res) => {
            count++;
            if (count === 1000) {
                let throughputEnd = Date.now();
                let latency = (throughputEnd - throughputStart) / 1000;
                console.log(`Average Query Latency: ${latency} ms`);
                console.log(`Query Throughput: ${(1000 * 1) / latency} requests/second`);
            }
        });
    }

}

function initializeDistributedGroup() {
    const ip1 = process.argv[2];
    const ip2 = process.argv[3];
    const ip3 = process.argv[4];
    const n1 = {ip: ip1, port: 8000};
    const n2 = {ip: ip2, port: 8000};
    const n3 = { ip: ip3, port: 8000 };
    const group = {
        n1: n1,
        n2: n2,
        n3: n3
    };
    global.distribution.local.groups.put(gid, group, (err, res) => {
        global.distribution[gid].groups.put(gid, group, (e, v) => {
            generateData(1000);
            insertData();
            queryData();
        });
    });
}

initializeDistributedGroup();