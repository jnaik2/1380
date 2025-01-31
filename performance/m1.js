#!/usr/bin/env node
const { performance, PerformanceObserver } = require("perf_hooks")
const { serialize, deserialize } = require("../distribution/util/serialization")

const serializeDeserialize = x => deserialize(serialize(x))

function measureBasePerformance() {
    const perfObserver = new PerformanceObserver((items) => {
        latencies = []
        items.getEntries().forEach((entry) => {
            latencies.push(entry.duration)
        })
        console.log(`Average base latency: ${latencies.reduce((a, b) => a + b, 0) / latencies.length}`)
    })

    perfObserver.observe({ entryTypes: ["function"] , buffered: true})
    const perfWrapper = performance.timerify(serializeDeserialize)
    const tests = [9938387, false, undefined, null, NaN, "true", "hdjsjkdsldlkjklfdsakldfjkslkdflsjklfdsa"]
    tests.forEach((test) => {
        perfWrapper(test)
    })
}

function measureFunctionPerformance() {
    const perfObserver = new PerformanceObserver((items) => {
        latencies = []
        items.getEntries().forEach((entry) => {
            latencies.push(entry.duration)
        })
        console.log(`Average function latency: ${latencies.reduce((a, b) => a + b, 0) / latencies.length}`)
    })

    perfObserver.observe({ entryTypes: ["function"] , buffered: true})
    const perfWrapper = performance.timerify(serializeDeserialize)
    function dec(x) {
        if (x == 0) {
            return 0
        }
        return dec(x - 1)
    } 
    const tests = [() => {}, (a, b) => {a + b}, (a,b,c,d,e,f,g,h,i,j,k) => {((x,y,z) => {x + y + z})(a,b,c)}, dec, () => {Math.random()}, (x, y) => { if (x > y) return x; else return y; } ]
    tests.forEach((test) => {
        perfWrapper(test)
    })
}

function measureComplexPerformance() {
    const perfObserver = new PerformanceObserver((items) => {
        latencies = []
        items.getEntries().forEach((entry) => {
            latencies.push(entry.duration)
        })
        console.log(`Average complex latency: ${latencies.reduce((a, b) => a + b, 0) / latencies.length}`)
    })

    perfObserver.observe({ entryTypes: ["function"] , buffered: true})
    const perfWrapper = performance.timerify(serializeDeserialize)
    const user = {}
    user.self = user
    const tests = [{}, [], user, console.log, [new Date(), {}, new Error("hi"), {"3": 4, "4": true, "5": {}}] ]
    tests.forEach((test) => {
        perfWrapper(test)
    })
}


measureBasePerformance()
measureFunctionPerformance()
measureComplexPerformance()