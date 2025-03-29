// This file is used to force a hard reload of the application
// This helps clear cached CSS and other assets
console.log("Forcing cache refresh - " + new Date().toISOString());

// Clear browser cache for this site
if (caches) {
  caches.keys().then(function(names) {
    for (let name of names) caches.delete(name);
  });
}

// If used directly, force a hard reload
if (window.location.search.indexOf('force_reload') === -1) {
  const reloadUrl = window.location.href + 
    (window.location.search ? '&' : '?') + 
    'force_reload=' + Date.now();
  
  console.log("Redirecting to: " + reloadUrl);
  window.location.href = reloadUrl;
}
