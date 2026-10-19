"""Tests for testo_core.cli.commands.config."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from testo_core.cli.commands.config import _STARTER_YAML
from testo_core.config.loader import ConfigLoader


class TestConfigInit:
    """Tests for the config init command's starter YAML."""

    def test_starter_yaml_is_valid(self) -> None:
        """The starter YAML from config init loads successfully."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "testosterone.yaml"
            config_path.write_text(_STARTER_YAML, encoding="utf-8")

            loader = ConfigLoader()
            cfg = loader.load(config_path)

            assert cfg is not None
            assert cfg.version == 1
            assert len(cfg.cycles) > 0

    def test_starter_yaml_has_no_marker_filtered_smoke_test(self) -> None:
        """The default smoke-test cycle has no -m marker filter (works out of box)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "testosterone.yaml"
            config_path.write_text(_STARTER_YAML, encoding="utf-8")

            loader = ConfigLoader()
            cfg = loader.load(config_path)

            smoke_test_cycle = cfg.cycles.get("smoke-test")
            assert smoke_test_cycle is not None, "smoke-test cycle not found"

            # Check that no stage has a -m marker filter in its args
            for stage in smoke_test_cycle.stages:
                args = stage.args or []
                assert "-m" not in args, (
                    f"Stage {stage.name} has -m marker filter in args; "
                    "starter config should work out of box without marked tests"
                )

    def test_starter_yaml_has_pytest_stage_with_basic_args(self) -> None:
        """The smoke-test cycle has a pytest stage with basic args (no custom markers)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "testosterone.yaml"
            config_path.write_text(_STARTER_YAML, encoding="utf-8")

            loader = ConfigLoader()
            cfg = loader.load(config_path)

            smoke_test_cycle = cfg.cycles.get("smoke-test")
            assert smoke_test_cycle is not None

            # Find the pytest stage
            pytest_stages = [
                s for s in smoke_test_cycle.stages if str(s.framework) == "pytest"
            ]
            assert len(pytest_stages) > 0, "No pytest stage found in smoke-test cycle"

            pytest_stage = pytest_stages[0]
            args = pytest_stage.args or []
            # Should have -q for quiet mode, but no -m marker filter
            assert "-q" in args, "Expected -q flag for quiet pytest output"