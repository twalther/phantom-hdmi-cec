const http = require('http');
const request = require('request-promise-native');
const url = require('url');

// UPNP
const ssdp = require('node-ssdp').Client;
const client = new ssdp();

// HDMI_CEC
const cecMonitor = require('hdmi-cec').CecMonitor;
const logicalAddress = require('hdmi-cec').LogicalAddress;
const operationCode = require('hdmi-cec').OperationCode;

const deviceName = 'Devialet';
const MAX_VOLUME = 50;
const VOLUME_STEP_SIZE = 2;
const SEARCH_RENDERER_INTERVAL = 10000;

const monitor = new cecMonitor(deviceName, logicalAddress.AUDIOSYSTEM);

let previousVolume = -1;
let volume = -1;
let rendererHostname;
let renderePort;



client.on('response', function(headers, code, rinfo) {
	request(headers.LOCATION)
		.then(result => {
			if(result.indexOf('<modelName>Devialet UPnP Renderer</modelName>') !== -1) {
				const targetUrl = url.parse(headers.LOCATION);
				rendererHostname = targetUrl.hostname;
				rendererPort = targetUrl.port;

				console.log(rendererHostname);
				console.log(rendererPort);

				if(volume === -1) {
					getVolume()
						.then(result => {
							previousVolume = result;
							volume = result;
						});
				}
			}
		})
		.catch(reason => {
			console.log(reason);
		});
});

function searchRenderer() {
	client.search('urn:schemas-upnp-org:service:RenderingControl:2');
	setTimeout(searchRenderer, SEARCH_RENDERER_INTERVAL);
}

searchRenderer();

monitor.on('data', function(data) {
	//console.log(data);

	if(data.indexOf('key pressed: volume') !== -1 && data.indexOf('current') === -1) {
		//console.log(data);

		if(data.indexOf('key pressed: volume down') !== -1) {
			volume = volume - VOLUME_STEP_SIZE;
		} else {
			volume = volume + VOLUME_STEP_SIZE;
		}

		if(volume < 0) {
			volume = 0;
		} else if (volume > 127 || volume > MAX_VOLUME) {
			volume = Math.min(MAX_VOLUME, 127);
		}

		if(previousVolume !== volume) {
			setVolume(volume);

			previousVolume = volume;
		}
	}
});



function setVolume(volume) {
	if(!rendererHostname || !rendererPort || volume === -1) {
		return;
	}

	const xml = `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
					  <s:Body>
					     <u:SetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:2">
					       <InstanceID>0</InstanceID>
					       <Channel>Master</Channel>
					       <DesiredVolume>${volume}</DesiredVolume>
					     </u:SetVolume>
					  </s:Body>
					</s:Envelope`;
	
	const options = {
	  hostname: rendererHostname,
	  port: rendererPort,
	  path: '/Control/LibRygelRenderer/RygelRenderingControl',
	  method: 'POST',
	  headers: {
	    'Content-Type': 'application/x-www-form-urlencoded',
	    'SOAPACTION': 'urn:schemas-upnp-org:service:RenderingControl:2#SetVolume',
	    'Content-Length': xml.length
	  }
	}
	
	var req = http.request(options, (res) => {
	  res.setEncoding('utf8');
	});
	 
	req.on('error', (e) => {
	  console.log(`problem with request: ${e.message}`);
	});
	
	req.write(xml); 
	req.end();
}



function getVolume() {
	if(!rendererHostname || !rendererPort) {
		return;
	}

	const xml = `<?xml version="1.0" encoding="utf-8"?>
					<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
						<s:Body>
							<u:GetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:2">
								<InstanceID>0</InstanceID>
								<Channel>Master</Channel>
							</u:GetVolume>
						</s:Body>
					</s:Envelope>`;
	
	const options = {
	  hostname: rendererHostname,
	  port: rendererPort,
	  path: '/Control/LibRygelRenderer/RygelRenderingControl',
	  method: 'POST',
	  headers: {
	    'Content-Type': 'application/x-www-form-urlencoded',
	    'SOAPACTION': 'urn:schemas-upnp-org:service:RenderingControl:2#GetVolume',
	    'Content-Length': xml.length
	  }
	}

	let data = '';
	
	return new Promise((resolve, reject) => {
		var req = http.request(options, (res) => {
			res.setEncoding('utf8');

			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', function () {
	/*<?xml version="1.0"?>
		<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
			<s:Body>
				<u:GetVolumeResponse xmlns:u=urn:schemas-upnp-org:service:RenderingControl:2">
					<CurrentVolume>10</CurrentVolume><
				/u:GetVolumeResponse>
			</s:Body>
		</s:Envelope>*/
				const matches = /<CurrentVolume>(\d+)<\/CurrentVolume>/.exec(data);
				resolve(parseInt(matches[1]));
			});
		});
		 
		req.on('error', (err) => {
		  reject(err);
		});
		
		req.write(xml); 
		req.end();
	});
}