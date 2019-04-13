// MIT License
//
// Copyright 2018-2019 Electric Imp
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
const Identifier = require('../../lib/util/Identifier');
const UserInterractor = require('../../lib/util/UserInteractor');
const Util = require('util');
const MessageHelper = require('../MessageHelper');
const Shell = require('shelljs');

const PRODUCT_NAME = `__impt_dev_product${config.suffix}`;
const DEVICE_GROUP_NAME = `__impt_dev_device_group${config.suffix}`;

const outputMode = '';

// Test suite for 'impt device restart' command.
// Runs 'impt device restart' command with different combinations of options,
describe(`impt device restart test suite (output: ${outputMode ? outputMode : 'default'}) >`, () => {
    let device_mac = null;
    let old_name = null;
    let device_name = null;
    let agent_id = null;
    let saved_dg_id = null;

    beforeAll((done) => {
        ImptTestHelper.init().
            then(_testSuiteInit).
            then(done).
            catch(error => done.fail(error));
    }, ImptTestHelper.TIMEOUT);

    afterAll((done) => {
        _testSuiteCleanUp().
            then(ImptTestHelper.cleanUp).
            then(done).
            catch(error => done.fail(error));
    }, ImptTestHelper.TIMEOUT);

    // prepare environment for device restart command testing
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
            then(() => ImptTestHelper.runCommand(`impt product delete -p ${PRODUCT_NAME} -f -q`, ImptTestHelper.emptyCheck)).
            then(() => ImptTestHelper.runCommand(`impt project create --product ${PRODUCT_NAME} --create-product --name ${DEVICE_GROUP_NAME}  ${outputMode}`, ImptTestHelper.emptyCheck)).
            then(() => Shell.cp('-Rf', `${__dirname}/fixtures/device.nut`, ImptTestHelper.TESTS_EXECUTION_FOLDER)).
            then(() => ImptTestHelper.deviceAssign(DEVICE_GROUP_NAME)).
            then(() => ImptTestHelper.runCommand(`impt build run`, ImptTestHelper.emptyCheck));
    }

    // delete all entities using in impt device restart test suite
    function _testSuiteCleanUp() {
        return ImptTestHelper.runCommand(`impt product delete -p ${PRODUCT_NAME} -f -q`, ImptTestHelper.emptyCheck).
            then(() => ImptTestHelper.runCommand(`impt device update -d ${config.devices[config.deviceidx]} --name "${old_name ? old_name : ''}"`, ImptTestHelper.emptyCheck)).
            then(() => {
                if (saved_dg_id) {
                    return ImptTestHelper.deviceAssign(saved_dg_id);
                }
            });
    }

    // check 'device successfully restarted' output message 
    function _checkSuccessRestartedDeviceMessage(commandOut, device) {
        ImptTestHelper.checkOutputMessage(`${outputMode}`, commandOut,
            Util.format(`${UserInterractor.MESSAGES.DEVICE_RESTARTED}`,
                `${Identifier.ENTITY_TYPE.TYPE_DEVICE} "${device}"`)
        );
    }

    // check 'device successfully coditional restarted' output message 
    function _checkSuccessCondRestartedDeviceMessage(commandOut, device) {
        ImptTestHelper.checkOutputMessage(`${outputMode}`, commandOut,
            Util.format(`${UserInterractor.MESSAGES.DEVICE_COND_RESTARTED}`,
                `${Identifier.ENTITY_TYPE.TYPE_DEVICE} "${device}"`)
        );
    }

    describe('device restart positive tests >', () => {
        it('restart device by device id', (done) => {
            ImptTestHelper.runCommand(`impt device restart --device ${config.devices[config.deviceidx]} ${outputMode}`, (commandOut) => {
                _checkSuccessRestartedDeviceMessage(commandOut, config.devices[config.deviceidx]);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });

        it('restart device by device name', (done) => {
            ImptTestHelper.runCommand(`impt device restart -d ${device_name} ${outputMode}`, (commandOut) => {
                _checkSuccessRestartedDeviceMessage(commandOut, device_name);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });

        it('restart device by device mac', (done) => {
            ImptTestHelper.runCommand(`impt device restart -d ${device_mac} ${outputMode}`, (commandOut) => {
                _checkSuccessRestartedDeviceMessage(commandOut, device_mac);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });

        it('conditional restart device by agent id', (done) => {
            ImptTestHelper.runCommand(`impt device restart -c -d ${agent_id} ${outputMode}`, (commandOut) => {
                _checkSuccessCondRestartedDeviceMessage(commandOut, agent_id);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });

        xit('restart device with log', (done) => {
            ImptTestHelper.runCommandInteractive(`impt device restart -l -d ${config.devices[config.deviceidx]} ${outputMode}`, (commandOut) => {
                _checkSuccessRestartedDeviceMessage(commandOut, config.devices[config.deviceidx]);
                ImptTestHelper.checkSuccessStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });
    });

    describe('device group create negative tests >', () => {
        it('restart not exist device', (done) => {
            ImptTestHelper.runCommand(`impt device restart -d not-exist-device ${outputMode}`, (commandOut) => {
                MessageHelper.checkEntityNotFoundError(commandOut, MessageHelper.DEVICE, 'not-exist-device');
                ImptTestHelper.checkFailStatus(commandOut);
            }).
                then(done).
                catch(error => done.fail(error));
        });
    });
});

