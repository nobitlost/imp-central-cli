// MIT License
//
// Copyright 2018 Electric Imp
//
// SPDX-License-Identifier: MIT
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
// EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
// OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

'use strict';

require('jasmine-expect');
const config = require('../config');
const ImptTestHelper = require('../ImptTestHelper');
const MessageHelper = require('../MessageHelper');

const PRODUCT_NAME = `__impt_dev_product${config.suffix}`;
const DEVICE_GROUP_NAME = `__impt_dev_device_group${config.suffix}`;

const outputMode = '-z json';

// Test suite for 'impt device info' command.
// Runs 'impt device info' command with different combinations of options,
describe(`impt device info test suite (output: ${outputMode ? outputMode : 'default'}) >`, () => {
    let product_id = null;
    let dg_id = null;
    let build_id = null;
    let device_mac = null;
    let device_name = null;
    let old_name = null;
    let agent_id = null;
    let saved_dg_id = null;

    beforeAll((done) => {
        ImptTestHelper.init().
            then(done).
            catch(error => done.fail(error));
    }, ImptTestHelper.TIMEOUT);

    afterAll((done) => {
        ImptTestHelper.cleanUp().
            then(done).
            catch(error => done.fail(error));
    }, ImptTestHelper.TIMEOUT);

    // prepare environment for device info command testing
    function _testSuiteInit() {
        return ImptTestHelper.getDeviceGroupOfAssignedDevice((output) => {
            saved_dg_id = output && output.dg ? output.dg : null;
        }).
            then(() => ImptTestHelper.getDeviceAttrs(PRODUCT_NAME, DEVICE_GROUP_NAME, (commandOut) => {
                if (commandOut && commandOut.mac) {
                    device_mac = commandOut.mac;
                    old_name = commandOut.name;
                    device_name = `${config.devices[config.deviceidx]}${config.suffix}`;
                    agent_id = commandOut.agentid;
                }
                else fail("TestSuitInit error: Failed to get additional device attributes");
            })).
            then(() => ImptTestHelper.runCommand(`impt device update -d ${config.devices[config.deviceidx]} --name ${device_name}`, ImptTestHelper.emptyCheck)).
            then(() => ImptTestHelper.runCommand(`impt product delete -p ${PRODUCT_NAME} -f -b -q`, ImptTestHelper.emptyCheck)).
            then(() => ImptTestHelper.runCommand(`impt product create -n ${PRODUCT_NAME}`, (commandOut) => {
                product_id = ImptTestHelper.parseId(commandOut);
                if (!product_id) fail("TestSuitInit error: Failed to create product");
                ImptTestHelper.emptyCheck(commandOut);
            })).
            then(() => ImptTestHelper.runCommand(`impt dg create -n ${DEVICE_GROUP_NAME} -p ${PRODUCT_NAME}`, (commandOut) => {
                dg_id = ImptTestHelper.parseId(commandOut);
                if (!dg_id) fail("TestSuitInit error: Failed to create device group");
                ImptTestHelper.emptyCheck(commandOut);
            })).
            then(() => ImptTestHelper.deviceAssign(DEVICE_GROUP_NAME)).
            then(() => ImptTestHelper.runCommand(`impt build deploy -g ${DEVICE_GROUP_NAME}`, (commandOut) => {
                build_id = ImptTestHelper.parseId(commandOut);
                if (!build_id) fail("TestSuiteInit error: Failed to create build");
                ImptTestHelper.emptyCheck(commandOut);
            }));
    }

    // delete all entities using in impt device info test suite
    function _testSuiteCleanUp() {
        return ImptTestHelper.runCommand(`impt product delete -p ${PRODUCT_NAME} -f -b -q`, ImptTestHelper.emptyCheck).
            then(() => ImptTestHelper.runCommand(`impt device update -d ${config.devices[config.deviceidx]} --name "${old_name ? old_name : ''}"`, ImptTestHelper.emptyCheck)).
            then(() => {
                if (saved_dg_id) {
                    return ImptTestHelper.deviceAssign(saved_dg_id);
                }
            });
    }

    function _checkDeviceInfo(commandOut) {
        let json = JSON.parse(commandOut.output);
        expect(json.Device.id).toBe(config.devices[config.deviceidx]);
        expect(json.Device.name).toBe(device_name);
        expect(json.Device.mac_address).toBe(device_mac);
        expect(json.Device.agent_id).toBe(agent_id);
        expect(json.Device['Device Group'].id).toBe(dg_id);
        expect(json.Device['Device Group'].name).toBe(DEVICE_GROUP_NAME);
        expect(json.Device['Device Group']['Current Deployment'].id).toBe(build_id);
        expect(json.Device['Product'].id).toBe(product_id);
        expect(json.Device['Product'].name).toBe(PRODUCT_NAME);
    }

    describe('impt device info positive  tests >', () => {
        beforeAll((done) => {
            _testSuiteInit().
                then(done).
                catch(error => done.fail(error));
        }, ImptTestHelper.TIMEOUT);

        afterAll((done) => {
            _testSuiteCleanUp().
                then(done).
                catch(error => done.fail(error));
        }, ImptTestHelper.TIMEOUT);

        it('device info by id', (done) => {
            ImptTestHelper.runCommand(`impt device info --device ${config.devices[config.deviceidx]} -z json`, (commandOut) => {
                _checkDeviceInfo(commandOut);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });

        it('device info by name', (done) => {
            ImptTestHelper.runCommand(`impt device info --device ${device_name} -z json`, (commandOut) => {
                _checkDeviceInfo(commandOut);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });

        it('device info by mac', (done) => {
            ImptTestHelper.runCommand(`impt device info --device ${device_mac} -z json`, (commandOut) => {
                _checkDeviceInfo(commandOut);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });

        it('device info by agent id', (done) => {
            ImptTestHelper.runCommand(`impt device info --device ${agent_id} -z json`, (commandOut) => {
                _checkDeviceInfo(commandOut);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });

        it('unassigned device info', (done) => {
            ImptTestHelper.runCommand(`impt device unassign -d ${config.devices[config.deviceidx]}`, ImptTestHelper.emptyCheck).
                then(() => ImptTestHelper.runCommand(`impt device info --device ${config.devices[config.deviceidx]} -z json`, (commandOut) => {
                    let json = JSON.parse(commandOut.output);
                    expect(json.Device.id).toBe(config.devices[config.deviceidx]);
                    expect(json.Device.name).toBe(device_name);
                    expect(json.Device.mac_address).toBe(device_mac);
                    expect(json.Device.agent_id).toBeEmptyString();
                    expect(json.Device['Device Group']).toBeUndefined();
                    expect(json.Device['Product']).toBeUndefined();
                    ImptTestHelper.checkSuccessStatus(commandOut);
                })).
                then(done).
                catch(error => done.fail(error));
        });

    });

    describe('impt device info negative tests >', () => {
        it('not exist device info', (done) => {
            ImptTestHelper.runCommand(`impt device info -d not-exist-device`, (commandOut) => {
                MessageHelper.checkEntityNotFoundError(commandOut, MessageHelper.DEVICE, 'not-exist-device');
                ImptTestHelper.checkFailStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });

        it('device info without device value', (done) => {
            ImptTestHelper.runCommand(`impt device info -d`, (commandOut) => {
                MessageHelper.checkNotEnoughArgumentsError(commandOut, 'd');
                ImptTestHelper.checkFailStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });
    });
});
