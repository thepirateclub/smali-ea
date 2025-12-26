const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 8080;
const directory = './src';

const server = http.createServer((req, res) => {
    // Sanitize the request path to prevent directory traversal
    const sanitizedPath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '').replace(/\\/g, '/');
    let filePath = path.join(directory, sanitizedPath);

    // Default to index.html if the path is a directory
    if (filePath.endsWith('/')) {
        filePath = path.join(filePath, 'index.html');
    }

    // Determine the content type based on file extension
    const extname = path.extname(filePath).toLowerCase();
    let contentType = 'text/html';

    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpg';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
        case '.ico':
            contentType = 'image/x-icon';
            break;
        default:
            contentType = 'text/html';
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            // Success - send the file
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
    console.log(`Serving files from ${directory} directory`);
});