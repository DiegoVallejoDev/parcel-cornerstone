module.exports = function handler(req, res) {
    const cpuLoad = Math.floor(Math.random() * 100);
    const isOverloaded = cpuLoad > 80;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

    res.status(200).json({
        status: isOverloaded ? 'critical' : 'operational',
        cpu: cpuLoad,
        time: new Date().toISOString(),
    });
};
