package main

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestEncode(t *testing.T)  {
	test := grid{{0, 1}, {1, 0}}
	assert.Equal(t, "bo$ob$", string(test.encode()))

	test = grid{{1, 0}, {0, 1}}
	assert.Equal(t, "ob$bo$", string(test.encode()))

	test = grid{{0, 0}, {1, 1}}
	assert.Equal(t, "2b$2o$", string(test.encode()))


	test = grid{{0, 0, 1, 1}, {1, 0, 1, 1}}
	assert.Equal(t, "2b2o$ob2o$", string(test.encode()))
}