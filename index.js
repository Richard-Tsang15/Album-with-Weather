const fs = require("fs");
const url = require("url");
const http = require("http");
const https = require("https");

const querystring = require("querystring");

const {client_id, client_secret, scope} = require("./auth/credentials.json");
const {appid} = require("./auth/API key.json");
const redirect_uri = "http://localhost:3000/receive_code";

const port = 3000;



const server = http.createServer();
let title_ = "";

server.on("listening", listen_handler);
server.listen(port);
function listen_handler(){
	console.log(`Now Listening on Port ${port}`);
	console.log(server.address());
}

server.on("request", request_handler);
function request_handler(req, res){
    console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);
    if(req.url === "/"){
        const form = fs.createReadStream("html/index.html");
		
		res.writeHead(200, {"Content-Type": "text/html"})
		form.pipe(res); // takes in the results of title from the form
    }
	else if (req.url.startsWith("/collectiontitle")){
		console.log("hello");
		console.log(req.url);

	
		let user_input = url.parse(req.url,true).query;
		

// checks if there's spaces in response
		var string_user_input = JSON.stringify(user_input);
		console.log(string_user_input);
		for ( var position = 0; position < string_user_input.length; ++position){
	if(string_user_input.charAt(position) == " "|| string_user_input.charAt(position) == null)
			nospaces(res);
		}
		const {title} = user_input;
		title_ = title;
		redirect_to_unsplash(res);
    }
	
	else if(req.url.startsWith("/receive_code")){
        let user_input = url.parse(req.url, true).query;
        const {code} = user_input;
        console.log("code is", code);
	if(code === undefined){
            not_found(res);
            return;
        }
        send_access_token_request(code,title_, res);
		res.writeHead(200, "text/html");
    }
    else{
       not_found(res);
    } 
}

function not_found(res){
	res.writeHead(404, {"Content-Type": "text/html"});
	res.end(`<h1>404 Not Found</h1>`);
}

function nospaces(res){
	res.writeHead(404, {"Content-Type": "text/html"});
	res.end(`<h1>404 Not Found</h1><br> <p>Please Remove all spaces from response<p>`);
}
function redirect_to_unsplash(res){
	const authorization_endpoint = "https://unsplash.com/oauth/authorize";
	const response_type = "code";
	console.log({client_id, redirect_uri, response_type, scope});
    let uri = querystring.stringify({client_id, redirect_uri, response_type, scope});
		res.writeHead(302, {Location: `${authorization_endpoint}?${uri}`})// temp redirect
	   .end();
}


function send_access_token_request(code,title_, res){
	let code_ = {
		code_object: code
		};
	const token_endpoint = "https://unsplash.com/oauth/token";
	const post_data = querystring.stringify({client_id,client_secret,redirect_uri,code,grant_type:"authorization_code"});
	console.log(post_data);
	let options = {
		method: "POST",
		headers:{
			"Accept-Verison": "v1",
		}
	}
	https.request(
		token_endpoint, 
		options, 
		(token_stream) => process_stream(token_stream, receive_access_token,{title_}, res)
	).end(post_data);
}
function process_stream (stream, callback , ...args){
	let body = "";
	stream.on("data", chunk => body += chunk);
	stream.on("end", () => callback(body, ...args));
	console.log(body);
}

function receive_access_token(body, {title_}, res){
	const {access_token} = JSON.parse(body);

	send_new_collection_request(title_, access_token, res);
}

function send_new_collection_request(title_, access_token, res){
	console.log(access_token);
	const title_endpoint = "https://api.unsplash.com/collections";
	const post_data = JSON.stringify({"title":title_}); // converts to a JSON string
	const options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${access_token}`
		}
	}
	https.request(
		title_endpoint, 
		options, 
		(title_stream) => process_stream(title_stream, receive_title_response, res)
	).end(post_data);
}

function receive_title_response(body, res){
	const results = JSON.parse(body);
	console.log(results);
	
	 let result_string_title = String(results.title);
	 let result_string_published = String(results.published_at);
	let results_ = `
					<div style="width:49%; float:left;">
					<h1> New Collection From Unsplash</h1>
					title:${result_string_title}
					<br>
					published at:${result_string_published}
					<br>
					<br>
					</div>
`;
	
	 res.write(results_);

get_weather_info(appid, res);
 
}

	function get_weather_info(appid, res){
	const weather_endpoint = "https://api.openweathermap.org/data/2.5/weather?q=New%20York&appid=abcdefghijklmnopqrstuvwxyz123456";
	const weather_request = https.request(weather_endpoint, {method:"GET"});
	 weather_request.once("error", err => {throw err});
    weather_request.once("response", weather_stream => process_stream_weather(weather_stream,display_weather_data ));
    weather_request.end();

	function process_stream_weather (weather_stream, callback){
	let body = "";
	weather_stream.on("data", chunk => body += chunk);
	weather_stream.on("end", () => callback(body, res));
	console.log(body);
	}
}




function display_weather_data(body, res){
    let weather_object = JSON.parse(body);
console.log(weather_object);
	let weather_result_name= String(weather_object.name);
		let weather_result_weather = JSON.stringify(weather_object.weather);
		let weather_result_coord= JSON.stringify(weather_object.coord);
	 
	console.log( weather_result_name,weather_result_weather,weather_result_coord);
	let weather_results = `
							<div style="width:49%; float:right;">
							<h1>Open Weather Map of New York</h1>
							City name: ${weather_result_name}
							<br>
							Current Weather:${weather_result_weather}
							<br>
							Coords:${weather_result_coord}
							
							
							</div>`;
					

res.end(weather_results);


}









