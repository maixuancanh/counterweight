// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { ICasinoGameV2, SessionContext, StepResult, SessionPhase } from "./ICasinoGameV2.sol";

/// @notice Six sealed crates resolve against the selected balance layout in one VRF session.
/// @dev Each preset has a distinct variance profile and exactly 0.96 WAD expected payout.
contract Counterweight is ICasinoGameV2 {
  error Counterweight__InvalidGameData();
  error Counterweight__InvalidPreset();
  error Counterweight__NoPlayerAction();

  uint256 public constant WAD = 1e18;
  uint256 public constant TARGET_RTP_WAD = 960_000_000_000_000_000;
  uint256 public constant MAX_MULTIPLIER_WAD = 13_360_000_000_000_000_000;

  function quoteCaps(uint256 wager, bytes calldata gameData) external pure returns (uint256 maxEscrowStake, uint256 maxReservedProfit) {
    _decodePreset(gameData);
    maxEscrowStake = wager;
    uint256 maxPayout = (wager * MAX_MULTIPLIER_WAD) / WAD;
    maxReservedProfit = maxPayout > wager ? maxPayout - wager : 0;
  }

  function quoteRiskParams(uint256 wager, bytes calldata gameData) external pure returns (uint256 maxPayout, uint256 probabilityWad, uint256 expectedPayout, uint256 subJackpotVarianceScaled) {
    uint8 preset = _decodePreset(gameData);
    maxPayout = (wager * MAX_MULTIPLIER_WAD) / WAD;
    probabilityWad = _safeCount(preset) * WAD / 256;
    expectedPayout = (wager * TARGET_RTP_WAD) / WAD;
    subJackpotVarianceScaled = 0;
  }

  function onSessionStart(SessionContext calldata ctx) external pure returns (StepResult memory result) {
    uint8 preset = _decodePreset(ctx.gameData);
    uint256 maxPayout = (ctx.wagerBase * MAX_MULTIPLIER_WAD) / WAD;
    result.newGameState = abi.encode(preset);
    result.escrowDelta = 0;
    result.reservedProfitDelta = int256(maxPayout > ctx.wagerBase ? maxPayout - ctx.wagerBase : 0);
    result.nextPhase = SessionPhase.WAITING_RANDOMNESS;
    result.requestRandomnessNow = true;
    result.payout = 0;
  }

  function onPlayerAction(SessionContext calldata, bytes calldata) external pure returns (StepResult memory) {
    revert Counterweight__NoPlayerAction();
  }

  function onRandomness(SessionContext calldata ctx, bytes32 randomness) external pure returns (StepResult memory result) {
    uint8 preset = abi.decode(ctx.gameState, (uint8));
    if (preset > 2) revert Counterweight__InvalidPreset();
    uint8 entropy = uint8(randomness[0]);
    uint8 direction = uint8(randomness[1]) & 1;
    uint256 multiplierWad = _multiplierWad(preset, entropy);
    uint8[6] memory weights = _weights(preset, entropy, direction);
    int16 moment = _moment(preset, weights);
    uint256 payout = (ctx.wagerBase * multiplierWad) / WAD;
    result.newGameState = abi.encode(preset, entropy, direction, weights, moment, multiplierWad, payout);
    result.escrowDelta = 0;
    result.reservedProfitDelta = 0;
    result.nextPhase = SessionPhase.SETTLED;
    result.requestRandomnessNow = false;
    result.payout = payout;
  }

  function quoteForfeitPayout(SessionContext calldata) external pure returns (uint256) { return 0; }

  function _decodePreset(bytes calldata gameData) internal pure returns (uint8 preset) {
    if (gameData.length != 32) revert Counterweight__InvalidGameData();
    preset = abi.decode(gameData, (uint8));
    if (preset > 2) revert Counterweight__InvalidPreset();
  }

  function _safeCount(uint8 preset) internal pure returns (uint256) {
    if (preset == 0) return 64;
    if (preset == 1) return 32;
    return 16;
  }

  function _multiplierWad(uint8 preset, uint8 entropy) internal pure returns (uint256) {
    if (preset == 0) { if (entropy < 64) return 3_340_000_000_000_000_000; if (entropy < 128) return 500_000_000_000_000_000; return 0; }
    if (preset == 1) { if (entropy < 32) return 5_680_000_000_000_000_000; if (entropy < 96) return WAD; return 0; }
    if (entropy < 16) return 13_360_000_000_000_000_000;
    if (entropy < 48) return WAD;
    return 0;
  }

  function _weights(uint8 preset, uint8 entropy, uint8 direction) internal pure returns (uint8[6] memory values) {
    bool safe = entropy < _safeCount(preset);
    bool recovery = !safe && (preset == 0 ? entropy < 128 : preset == 1 ? entropy < 96 : entropy < 48);
    if (preset == 0) {
      if (safe) return [55, 80, 120, 55, 80, 120];
      if (recovery) return direction == 1 ? [120, 80, 80, 80, 80, 80] : [80, 80, 80, 120, 80, 80];
    } else if (preset == 1) {
      if (safe) return [80, 55, 120, 80, 55, 120];
      if (recovery) return direction == 1 ? [80, 120, 120, 80, 55, 120] : [80, 55, 120, 120, 55, 120];
    } else {
      if (safe) return [55, 80, 120, 55, 80, 120];
      if (recovery) return direction == 1 ? [80, 80, 120, 55, 80, 120] : [55, 80, 120, 80, 80, 120];
    }
    return direction == 1 ? [120, 120, 120, 35, 35, 35] : [35, 35, 35, 120, 120, 120];
  }

  function _moment(uint8 preset, uint8[6] memory w) internal pure returns (int16) {
    int16[6] memory positions;
    if (preset == 0) {
      positions = [int16(-1), -2, -3, 1, 2, 3];
    } else if (preset == 1) {
      positions = [int16(-3), -1, -2, 1, 3, 2];
    } else {
      positions = [int16(-3), -2, -1, 3, 2, 1];
    }
    int16 value;
    for (uint8 i; i < 6; ++i) value += positions[i] * int16(uint16(w[i]));
    return value;
  }
}
