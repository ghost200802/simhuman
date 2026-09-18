import {
  _decorator,
  Button,
  Color,
  Component,
  Graphics,
  Label,
  Node,
  UITransform,
} from "cc";
import { initWorld, query, step } from "../../sim-core";
import { SimConfig } from "../../sim-core/config/config-types";
import { WorldState } from "../../sim-core/world/world-types";
import { loadSimConfigFromResources } from "../sim-core/sim-config-resource-loader";

const { ccclass } = _decorator;

// Cocos Creator component entry for the initial interactive demo.

interface WorldSummary {
  worldId: string;
  tick: number;
  year: number;
  month: number;
  blockCount: number;
  edgeCount: number;
}

@ccclass("SimHumanDemo")
export class SimHumanDemo extends Component {
  private world: WorldState | null = null;
  private config: SimConfig | null = null;
  private statusLabel: Label | null = null;
  private selectionLabel: Label | null = null;
  private errorLabel: Label | null = null;
  private gridNode: Node | null = null;
  private selectedBlockId: number | null = null;

  public onLoad(): void {
    console.log("[SimHumanDemo] onLoad");
    this.buildShell();
    loadSimConfigFromResources((error, config) => {
      if (error || !config) {
        console.error("[SimHumanDemo] config_load_failed", error);
        this.showError(error ? error.message : "SIM_CONFIG_LOAD_FAILED");
        return;
      }
      this.config = config;
      this.world = initWorld(1, config);
      console.log("[SimHumanDemo] world_ready", this.world.worldId);
      this.renderWorld();
    });
  }

  private buildShell(): void {
    const rootTransform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    rootTransform.setContentSize(960, 640);
    this.createPanel(this.node, "Background", 0, 0, 960, 640, new Color(17, 25, 39, 255));
    this.createText(this.node, "SimHuman · Era 03/04 Core Demo", 0, 280, 28, new Color(236, 242, 255, 255));
    this.statusLabel = this.createText(this.node, "正在加载世界配置…", -430, 235, 20, new Color(190, 210, 232, 255));
    this.selectionLabel = this.createText(this.node, "点击区块查看区块信息", 250, 205, 18, new Color(190, 210, 232, 255));
    this.errorLabel = this.createText(this.node, "", 0, -285, 18, new Color(255, 120, 120, 255));
    this.gridNode = new Node("BlockGrid");
    this.gridNode.layer = this.node.layer;
    this.node.addChild(this.gridNode);
    this.gridNode.setPosition(-190, -35, 0);

    this.createButton(this.node, "推进 1 月", 270, 125, () => this.advance(1));
    this.createButton(this.node, "推进 12 月", 270, 75, () => this.advance(12));
    this.createButton(this.node, "重置世界", 270, 25, () => this.resetWorld());

    this.createText(this.node, "本 Demo 范围", 250, -45, 18, new Color(236, 242, 255, 255));
    this.createText(this.node, "地图：16 个固定区块\n图边：48 条双向连接\n人口：未接入\n生产与库存：未接入\n市场与战争：未接入", 250, -120, 16, new Color(165, 180, 205, 255));
  }

  private renderWorld(): void {
    if (!this.world || !this.gridNode) return;
    this.gridNode.removeAllChildren();
    for (const block of this.world.blockStates) {
      const blockNode = new Node("Block_" + block.id);
      blockNode.layer = this.node.layer;
      this.gridNode.addChild(blockNode);
      blockNode.setPosition(block.gridX * 94, -block.gridY * 94, 0);
      const transform = blockNode.addComponent(UITransform);
      transform.setContentSize(84, 84);
      const graphics = blockNode.addComponent(Graphics);
      graphics.fillColor = new Color(53, 86, 117, 255);
      graphics.strokeColor = new Color(123, 169, 203, 255);
      graphics.lineWidth = 2;
      graphics.rect(-42, -42, 84, 84);
      graphics.fill();
      graphics.stroke();
      this.createText(blockNode, "区块 " + block.id + "\n(" + block.gridX + "," + block.gridY + ")", 0, 0, 15, new Color(238, 245, 252, 255));
      blockNode.on(Node.EventType.TOUCH_END, () => this.selectBlock(block.id));
    }
    this.refreshStatus();
  }

  private selectBlock(blockId: number): void {
    if (!this.world) return;
    const block = this.world.blockStates.find((item) => item.id === blockId);
    if (!block || !this.selectionLabel) return;
    this.selectedBlockId = blockId;
    this.selectionLabel.string = "选中区块 " + block.id + " · 网格(" + block.gridX + ", " + block.gridY + ") · 地形 " + block.terrainId;
  }

  private advance(count: number): void {
    if (!this.world) return;
    step(this.world, count);
    this.refreshStatus();
  }

  private resetWorld(): void {
    if (!this.config) return;
    this.world = initWorld(1, this.config);
    this.selectedBlockId = null;
    if (this.selectionLabel) this.selectionLabel.string = "点击区块查看区块信息";
    this.renderWorld();
  }

  private refreshStatus(): void {
    if (!this.world || !this.statusLabel) return;
    const summary = query(this.world, { type: "world_summary" }) as unknown as WorldSummary;
    this.statusLabel.string = "世界 " + summary.worldId + "    日期 " + summary.year + " 年 " + summary.month + " 月    tick " + summary.tick + "    区块 " + summary.blockCount + "    图边 " + summary.edgeCount;
  }

  private showError(message: string): void {
    if (this.statusLabel) this.statusLabel.string = "世界加载失败";
    if (this.errorLabel) this.errorLabel.string = message;
  }

  private createText(parent: Node, text: string, x: number, y: number, fontSize: number, color: Color): Label {
    const node = new Node("Label");
    node.layer = this.node.layer;
    parent.addChild(node);
    node.setPosition(x, y, 0);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(520, 90);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.color = color;
    return label;
  }

  private createPanel(parent: Node, name: string, x: number, y: number, width: number, height: number, color: Color): Node {
    const node = new Node(name);
    node.layer = this.node.layer;
    parent.addChild(node);
    node.setPosition(x, y, 0);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = color;
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();
    return node;
  }

  private createButton(parent: Node, text: string, x: number, y: number, onClick: () => void): void {
    const node = this.createPanel(parent, text, x, y, 180, 38, new Color(43, 103, 137, 255));
    node.addComponent(Button);
    this.createText(node, text, 0, 0, 16, new Color(245, 250, 255, 255));
    node.on(Node.EventType.TOUCH_END, onClick);
  }
}
