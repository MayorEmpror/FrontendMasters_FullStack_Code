const http = require('http');
http.createServer(function(req, res){
	res.write("On the way to be a fullstack");
	res.end();
}).listen(3000);
console.log("server stat");

