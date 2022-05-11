import { SinonStubbedFn } from "@dendronhq/common-test-utils";
import sinon from "sinon";
import { window } from "vscode";
import { MigrateSelfContainedVaultCommand } from "../../commands/MigrateSelfContainedVault";
import { ExtensionProvider } from "../../ExtensionProvider";
import { VSCodeUtils } from "../../vsCodeUtils";
import { describeSingleWS } from "../testUtilsV3";
import { suite, test, before, after } from "mocha";
import { expect } from "../testUtilsv2";
import {
  ConfigUtils,
  CONSTANTS,
  FOLDERS,
  IntermediateDendronConfig,
  VaultUtils,
} from "@dendronhq/common-all";
import fs from "fs-extra";
import path from "path";
import { DConfig } from "@dendronhq/engine-server";

suite("GIVEN the MigrateSelfContainedVault command", () => {
  describeSingleWS(
    "WHEN there's only a single vault, and it's self contained",
    { selfContained: true },
    () => {
      let showErrorMessage: SinonStubbedFn<typeof window["showErrorMessage"]>;
      let reloadWindow: SinonStubbedFn<typeof VSCodeUtils["reloadWindow"]>;
      let showQuickPick: SinonStubbedFn<typeof VSCodeUtils["showQuickPick"]>;

      before(async () => {
        const cmd = new MigrateSelfContainedVaultCommand(
          ExtensionProvider.getExtension()
        );

        showErrorMessage = sinon.stub(window, "showErrorMessage");
        reloadWindow = sinon.stub(VSCodeUtils, "reloadWindow");
        showQuickPick = sinon.stub(VSCodeUtils, "showQuickPick");

        await cmd.run();
      });
      after(() => {
        [showErrorMessage, reloadWindow, showQuickPick].forEach((stub) =>
          stub.restore()
        );
      });

      test("THEN there's an error that there's nothing to migrate", () => {
        expect(showErrorMessage.calledOnce).toBeTruthy();
        expect(showErrorMessage.args[0][0].includes("no vault")).toBeTruthy();
      });

      test("THEN no vault is prompted for", () => {
        expect(showQuickPick.called).toBeFalsy();
      });

      test("THEN the workspace did not reload since there was no migration", () => {
        expect(reloadWindow.called).toBeFalsy();
      });
    }
  );

  describeSingleWS(
    "WHEN there's only a single vault, and it's not self contained",
    { selfContained: false },
    () => {
      let reloadWindow: SinonStubbedFn<typeof VSCodeUtils["reloadWindow"]>;
      let showQuickPick: SinonStubbedFn<typeof VSCodeUtils["showQuickPick"]>;

      before(async () => {
        const { vaults } = ExtensionProvider.getDWorkspace();
        const cmd = new MigrateSelfContainedVaultCommand(
          ExtensionProvider.getExtension()
        );

        reloadWindow = sinon.stub(VSCodeUtils, "reloadWindow");
        showQuickPick = sinon.stub(VSCodeUtils, "showQuickPick").resolves({
          label: VaultUtils.getName(vaults[0]),
        });

        await cmd.run();
      });
      after(() => {
        [reloadWindow, showQuickPick].forEach((stub) => stub.restore());
      });

      test("THEN it prompts for the vault", () => {
        expect(showQuickPick.callCount).toEqual(1);
      });

      test("THEN the workspace reloads to apply the migration", () => {
        expect(reloadWindow.called).toBeTruthy();
      });

      test("THEN the vault is migrated", async () => {
        const { wsRoot, vaults } = ExtensionProvider.getDWorkspace();
        const vaultFolder = path.join(wsRoot, vaults[0].fsPath);
        expect(await fs.pathExists(vaultFolder)).toBeTruthy();
        // If it is migrated, then it should have config files inside it
        expect(
          await fs.pathExists(
            path.join(vaultFolder, CONSTANTS.DENDRON_CONFIG_FILE)
          )
        ).toBeTruthy();
        expect(
          await fs.pathExists(path.join(vaultFolder, CONSTANTS.DENDRON_WS_NAME))
        ).toBeTruthy();
        // If it is migrated, the notes should be inside `notes` now
        const notesFolder = path.join(vaultFolder, FOLDERS.NOTES);
        expect(await fs.pathExists(notesFolder)).toBeTruthy();
        expect(
          await fs.pathExists(path.join(notesFolder, "root.md"))
        ).toBeTruthy();
        expect(
          await fs.pathExists(path.join(notesFolder, "root.schema.yml"))
        ).toBeTruthy();
        // and there should be no notes outside the notes folder
        expect(
          await fs.pathExists(path.join(vaultFolder, "root.md"))
        ).toBeFalsy();
        expect(
          await fs.pathExists(path.join(vaultFolder, "root.schema.yml"))
        ).toBeFalsy();
        // and the vault should be marked as self contained in the config
        const config = DConfig.getRaw(wsRoot) as IntermediateDendronConfig;
        const newVaults = ConfigUtils.getVaults(config);
        expect(newVaults.length).toEqual(1);
        expect(newVaults[0].selfContained).toBeTruthy();
      });
    }
  );
});
