import importlib.machinery
import importlib.util
import os
import unittest

_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "shipctl")
_loader = importlib.machinery.SourceFileLoader("shipctl", _path)
_spec = importlib.util.spec_from_loader("shipctl", _loader)
shipctl = importlib.util.module_from_spec(_spec)
_loader.exec_module(shipctl)

# Real lines from the 10gen/mms#193540 merge-queue failure (test log has print_time prefixes).
TEST_LOG = """\
[2026/10/26 15:07:40.526] ERROR: expected: <{"tag🙂":"🙂"}> but was: <{"tag\\ud83d\\ude42": "\\ud83d\\ude42"}> (org.opentest4j.AssertionFailedError)
[2026/10/26 15:07:40.526] org.opentest4j.AssertionFailedError: expected: <{"tag🙂":"🙂"}> but was: <{"tag\\ud83d\\ude42": "\\ud83d\\ude42"}>
[2026/10/26 15:07:40.526] \tat org.junit.jupiter.api.AssertionFailureBuilder.build(AssertionFailureBuilder.java:151)
[2026/10/26 15:07:40.526] \tat com.xgen.svc.nds.res.LifecycleManagementConfResourceUnitTests.configure_x(LifecycleManagementConfResourceUnitTests.java:553)
"""

TASK_LOG = """\
INFO Wrote the TSS answer for 1962 test ids to /data/mci/x/tss_quarantine_selection.json
reading test log spec; falling back to default spec: open /data/mci/x/build/TestLogs/log_spec.yaml: no such file
server/src/main/com/xgen/Foo.java:12: error: [NullAway] dereferenced expression bar is @Nullable
ConnectionResetError: [Errno 104] Connection reset by peer
Task completed - SUCCESS.
"""


class ResolveTest(unittest.TestCase):
    def test_targets(self):
        cases = {
            "https://github.com/10gen/mms/pull/193540": {"kind": "pr", "repo": "10gen/mms", "number": 193540},
            "10gen/mms#193540": {"kind": "pr", "repo": "10gen/mms", "number": 193540},
            "https://spruce.corp.mongodb.com/version/6adfcbeeb74d8500077cc245/tasks?variant=^unit_java$":
                {"kind": "version", "id": "6adfcbeeb74d8500077cc245"},
            "https://evergreen.mongodb.com/version/6adfea90346c2000079f5e93":
                {"kind": "version", "id": "6adfea90346c2000079f5e93"},
            "mms_a2c37b201a132576e070bdf067bca06b4fbc7a2c":
                {"kind": "version", "id": "mms_a2c37b201a132576e070bdf067bca06b4fbc7a2c"},
            "https://spruce.corp.mongodb.com/task/mms_unit_java_X_patch_0b28_6adf_26_10_26?execution=0":
                {"kind": "task", "id": "mms_unit_java_X_patch_0b28_6adf_26_10_26"},
        }
        for target, want in cases.items():
            self.assertEqual(want, shipctl.resolve(target, os.getcwd()), target)
        with self.assertRaises(shipctl.Fail):
            shipctl.resolve("not-a-target", os.getcwd())


class ExcerptTest(unittest.TestCase):
    def test_test_log_keeps_assertion_and_first_xgen_frame(self):
        lines = shipctl.test_excerpt(TEST_LOG)
        self.assertTrue(lines[0].startswith('ERROR: expected: <{"tag🙂":"🙂"}>'), lines)
        self.assertEqual(
            "at com.xgen.svc.nds.res.LifecycleManagementConfResourceUnitTests.configure_x"
            "(LifecycleManagementConfResourceUnitTests.java:553)", lines[-1])
        self.assertFalse(any("AssertionFailureBuilder" in l for l in lines))

    def test_task_log_drops_tss_noise(self):
        lines = shipctl.excerpt(TASK_LOG, shipctl.COMPILE_LINE_RE, 15)
        self.assertEqual(["server/src/main/com/xgen/Foo.java:12: error: [NullAway] dereferenced expression bar is @Nullable",
                          "ConnectionResetError: [Errno 104] Connection reset by peer"], lines)


class VerdictTest(unittest.TestCase):
    PR = {"state": "OPEN", "mergeable": "MERGEABLE"}

    def test_work_order(self):
        cases = [
            ({"on_default": True, "uncommitted": ["a"]}, "NO_BRANCH"),
            ({"uncommitted": ["a"]}, "UNCOMMITTED"),
            ({"ahead": 2}, "NO_PR"),
            ({}, "NOTHING"),
            ({"pr": dict(VerdictTest.PR, state="MERGED")}, "MERGED"),
            ({"pr": VerdictTest.PR, "unpushed": True, "checks_failed": ["x"]}, "UNPUSHED"),
            ({"pr": dict(VerdictTest.PR, mergeable="CONFLICTING"), "threads": [1], "checks_failed": ["x"]}, "CONFLICT"),
            ({"pr": VerdictTest.PR, "threads": [1], "checks_failed": ["x"]}, "THREADS"),
            ({"pr": VerdictTest.PR, "mq_failed_on_head": [{"reason": "FAILED_CHECKS"}]}, "CI_RED"),
            ({"pr": dict(VerdictTest.PR, mergeQueueEntry={"state": "QUEUED"})}, "WAITING"),
            ({"pr": VerdictTest.PR, "checks_pending": ["x"]}, "WAITING"),
            ({"pr": VerdictTest.PR}, "READY"),
        ]
        for facts, want in cases:
            self.assertEqual(want, shipctl.verdict(facts)[0], facts)
        self.assertEqual(["THREADS", "CI_RED"],
                         shipctl.verdict({"pr": self.PR, "threads": [1], "checks_failed": ["x"]})[1])


class MqHeadTest(unittest.TestCase):
    def test_reads_tested_head_from_message(self):
        msg = "GitHub Merge Queue: CLOUDP-459367: Canonicalize the LCM criteria query (#193540) (1865bbc) [merge-base 0b28312]"
        self.assertEqual("1865bbc", shipctl.mq_head({"message": msg}))
        self.assertIsNone(shipctl.mq_head({"message": "not a merge queue version"}))


class PatchPlanTest(unittest.TestCase):
    def test_plans(self):
        self.assertEqual(
            {"variant": "int", "task": "GENERATE_INT_TESTS_BAZEL_COMBINED", "narrowed": True, "task_def": "atm",
             "params": ["int_use_rbe=false", "task_def_names=atm"]},
            shipctl.patch_plan("INT_JAVA_ATM", "int", "GENERATE_INT_TESTS_BAZEL_COMBINED"))
        self.assertEqual(
            {"variant": "unit_java", "task": "GENERATE_UNIT_TESTS_BAZEL_RBE", "narrowed": False, "params": []},
            shipctl.patch_plan("UNIT_JAVA_NDS_API_UI", "unit_java", "GENERATE_UNIT_TESTS_BAZEL_RBE"))
        self.assertEqual(
            {"variant": "code_health", "task": "COMPILE_BAZEL", "narrowed": True, "params": []},
            shipctl.patch_plan("COMPILE_BAZEL", "code_health", None))


if __name__ == "__main__":
    unittest.main()
