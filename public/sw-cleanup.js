if (navigator.serviceWorker && !sessionStorage.getItem('godchess.sw-cleaned')) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    if (!registrations.length) return;
    return Promise.all(registrations.map(registration => registration.unregister())).then(() => {
      sessionStorage.setItem('godchess.sw-cleaned', '1');
      return caches?.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))));
    }).then(() => location.reload());
  }).catch(() => undefined);
}
