export const getApiBaseUrl = (): string => {
  const currentHost = window.location.hostname;
  const currentProtocol = window.location.protocol;
  const currentPort = window.location.port;
  
  // Calculate backend port by adding 900 to frontend port
  let backendPort: string;
  if (currentPort) {
    const frontendPort = parseInt(currentPort);
    backendPort = (frontendPort + 900).toString();
  } else {
    // Default ports based on protocol
    if (currentProtocol === 'https:') {
      backendPort = '9443'; // 443 + 900 = 1343, but using more logical 9443
    } else {
      backendPort = '9900'; // 80 + 900 = 980, but using 9900 as default
    }
  }
  
  return `${currentProtocol}//${currentHost}:${backendPort}/api`;
};