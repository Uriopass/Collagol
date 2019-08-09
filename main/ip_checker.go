package main

import (
	"sync"
)

type banner struct {
	IPs map[string]struct{}
	mu  sync.RWMutex
}

func initBanner() *banner {
	return &banner{
		IPs: make(map[string]struct{}),
	}
}

func (b *banner) connect(ip string) {
	b.mu.Lock()
	b.IPs[ip] = struct{}{}
	b.mu.Unlock()
}

func (b *banner) disconnect(ip string) {
	b.mu.Lock()
	delete(b.IPs, ip)
	b.mu.Unlock()
}

func (b *banner) isConnected(ip string) bool {
	b.mu.RLock()
	_, ok := b.IPs[ip]
	b.mu.RUnlock()
	return ok
}
