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
const Identifier = require('../../lib/util/Identifier');
const Util = require('util');
const UserInterractor = require('../../lib/util/UserInteractor');

const PRODUCT_NAME = `__impt_dev_product${config.suffix}`;
const DEVICE_GROUP_NAME = `__impt_dev_device_group${config.suffix}`;

// Test suite for 'impt device remove' command.
// Runs 'impt device remove' command with different combinations of options,
ImptTestHelper.OUTPUT_MODES.forEach((outputMode) => {
    xdescribe(`impt device remove test suite (output: ${outputMode ? outputMode : 'default'}) >`, () => {
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
            ImptTestHelper.cleanUp().
                then(_testSuiteCleanUp).
                then(done).
                catch(error => done.fail(error));
        }, ImptTestHelper.TIMEOUT);

        beforeEach((done) => {
            _addDeviceMessage().
                then(done).
                catch(error => done.fail(error));
        }, ImptTestHelper.TIMEOUT);

        // prepare environment for device remove command testing
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
                then(() => ImptTestHelper.runCommand(`impt product create -n ${PRODUCT_NAME}`, ImptTestHelper.emptyCheck)).
                then(() => ImptTestHelper.runCommand(`impt dg create -n ${DEVICE_GROUP_NAME} -p ${PRODUCT_NAME}`, ImptTestHelper.emptyCheck));
        }

        // delete all entities using in impt device remove test suite
        function _testSuiteCleanUp() {
            return ImptTestHelper.runCommand(`impt product delete -p ${PRODUCT_NAME} -f -b -q`, ImptTestHelper.emptyCheck).
                then(() => ImptTestHelper.runCommand(`impt device update -d ${config.devices[config.deviceidx]} --name "${old_name ? old_name : ''}"`, ImptTestHelper.emptyCheck)).
                then(() => {
                    if (saved_dg_id) {
                        return ImptTestHelper.deviceAssign(saved_dg_id);
                    }
                });
        }

        // show insert device message and waiting confirmation
        function _addDeviceMessage() {
            return new Promise((resolve, reject) => {
                console.log(`Add device "${config.devices[config.deviceidx]}" to your account manually and press Enter.`);
                process.stdin.once('data', function () {
                    resolve();
                });
            });
        }

        // check 'device successfully deleted' output message 
        function _checkSuccessDeleteDeviceMessage(commandOut, device) {
            ImptTestHelper.checkOutputMessage(`${outputMode}`, commandOut,
                Util.format(`${UserInterractor.MESSAGES.ENTITY_DELETED}`,
                    `${Identifier.ENTITY_TYPE.TYPE_DEVICE} "${device}"`)
            );
        }

        describe('remove unassigned device tests >', () => {
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

            it('remove device by id', (done) => {
                ImptTestHelper.runCommand(`impt device remove --device ${config.devices[config.deviceidx]} --confirmed ${outputMode}`, (commandOut) => {
                    _checkSuccessDeleteDeviceMessage(commandOut, config.devices[config.deviceidx]);
                    ImptTestHelper.checkSuccessStatus(commandOut);
                }).
                    then(() => ImptTestHelper.runCommand(`impt device info -d ${config.devices[config.deviceidx]}`, ImptTestHelper.checkFailStatus)).
                    then(done).
                    catch(error => done.fail(error));
            });

            it('remove device by mac', (done) => {
                ImptTestHelper.runCommand(`impt device remove -d ${device_mac} -q ${outputMode}`, (commandOut) => {
                    _checkSuccessDeleteDeviceMessage(commandOut, device_mac);
                    ImptTestHelper.checkSuccessStatus(commandOut);
                }).
                    then(() => ImptTestHelper.runCommand(`impt device info -d ${config.devices[config.deviceidx]}`, ImptTestHelper.checkFailStatus)).
                    then(done).
                    catch(error => done.fail(error));
            });

            it('remove device by agent id', (done) => {
                ImptTestHelper.runCommand(`impt device remove -d ${agent_id} -q ${outputMode}`, (commandOut) => {
                    _checkSuccessDeleteDeviceMessage(commandOut, agent_id);
                    ImptTestHelper.checkSuccessStatus(commandOut);
                }).
                    then(() => ImptTestHelper.runCommand(`impt device info -d ${config.devices[config.deviceidx]}`, ImptTestHelper.checkFailStatus)).
                    then(done).
                    catch(error => done.fail(error));
            });

            it('remove device by name', (done) => {
                ImptTestHelper.runCommand(`impt device remove -d ${device_name} -q ${outputMode}`, (commandOut) => {
                    _checkSuccessDeleteDeviceMessage(commandOut, device_name);
                    ImptTestHelper.checkSuccessStatus(commandOut);
                }).
                    then(() => ImptTestHelper.runCommand(`impt device info -d ${config.devices[config.deviceidx]}`, ImptTestHelper.checkFailStatus)).
                    then(done).
                    catch(error => done.fail(error));
            });

        });

        describe('remove assigned device tests >', () => {
            beforeAll((done) => {
                ImptTestHelper.deviceAssign(DEVICE_GROUP_NAME).
                    then(done).
                    catch(error => done.fail(error));
            }, ImptTestHelper.TIMEOUT);

            it('force remove assigned device', (done) => {
                ImptTestHelper.runCommand(`impt device remove -d ${config.devices[config.deviceidx]} --force -q ${outputMode}`, (commandOut) => {
                    _checkSuccessDeleteDeviceMessage(commandOut, config.devices[config.deviceidx]);
                    ImptTestHelper.checkSuccessStatus(commandOut);
                }).
                    then(() => ImptTestHelper.runCommand(`impt device info -d ${config.devices[config.deviceidx]}`, ImptTestHelper.checkFailStatus)).
                    then(done).
                    catch(error => done.fail(error));
            });

            it('remove assigned device', (done) => {
                ImptTestHelper.runCommand(`impt device remove -d ${config.devices[config.deviceidx]} -q ${outputMode}`, (commandOut) => {
                    _checkSuccessDeleteDeviceMessage(commandOut, config.devices[config.deviceidx]);
                    ImptTestHelper.checkSuccessStatus(commandOut);
                }).
                    then(done).
                    catch(error => done.fail(error));
            });
        });
    });
});
