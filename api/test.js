module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json({
        success: true,
        message: 'Vercel API работает!',
        method: req.method,
        path: req.url,
        timestamp: new Date().toISOString()
    });
};
