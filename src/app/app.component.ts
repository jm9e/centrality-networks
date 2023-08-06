import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import * as vis from 'vis';

interface Node {
  id: number;
  label: string;
  edgesOut: number[];
  edgesIn: number[];
  score?: number;
}

interface Edge {
  from: number;
  to: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'centrality';

  nodes: Node[] = [];
  edges: Edge[] = [];

  nodeData?: vis.DataSet<vis.Node>;
  edgeData?: vis.DataSet<vis.Edge>;
  network?: vis.Network;

  centrality = 1;

  @ViewChild('mynetwork') el?: ElementRef;

  constructor() {
  }

  public generate() {
    if (!this.el) {
      return;
    }
    this.fillGraph(16, 1, Infinity);
    this.drawGraph(this.el.nativeElement);
  }

  public paintNodes() {
    this.centrality = parseInt(`${this.centrality}`);
    switch (this.centrality) {
      case 1:
        this.paintDegree();
        break;
      case 2:
        this.paintCloseness();
        break;
      case 3:
        this.paintBetweenness();
        break;
    }
  }

  public paintDegree() {
    let minScore = Infinity;
    let maxScore = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      node.score = node.edgesIn.length + node.edgesOut.length;
    }
    this.paintScores();
  }

  public paintCloseness() {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      node.score = closenessCentrality(this.nodes, this.edges, i);
    }
    this.paintScores();
  }

  public paintBetweenness() {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      node.score = betweennessCentrality(this.nodes, i);
    }
    this.paintScores();
  }

  private paintScores() {
    if (!this.nodeData || !this.edgeData || !this.network) {
      return;
    }
    let minScore = Infinity;
    let maxScore = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (!node.score) {
        node.score = 0;
      }
      if (node.score > maxScore) {
        maxScore = node.score;
      }
      if (node.score < minScore) {
        minScore = node.score;
      }
    }
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      this.nodeData.update({id: i, color: {background: this.scoreToColor(((node.score ?? 0) - minScore) / (maxScore - minScore))}});
    }
  }

  private scoreToColor(score: number) {
    // Calculate the hue value
    const hue = (1 - score) * 240;

    // Convert hue to RGB values
    let r, g, b: number;
    if (hue < 60) {
      r = 255;
      g = Math.round((hue / 60) * 255);
      b = 0;
    } else if (hue < 120) {
      r = Math.round(((120 - hue) / 60) * 255);
      g = 255;
      b = 0;
    } else if (hue < 180) {
      r = 0;
      g = 255;
      b = Math.round(((hue - 120) / 60) * 255);
    } else if (hue < 240) {
      r = 0;
      g = Math.round(((240 - hue) / 60) * 255);
      b = 255;
    } else {
      r = Math.round(((hue - 240) / 60) * 255);
      g = 0;
      b = 255;
    }

    // Return the RGB CSS color string
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }

  private drawGraph(el: HTMLElement) {
    // create an array with nodes
    this.nodeData = new vis.DataSet(this.nodes.map(n => ({...n})));

    // create an array with edges
    this.edgeData = new vis.DataSet(this.edges.map(e => ({...e})));

    // provide the data in the vis format
    const data = {
      nodes: this.nodeData,
      edges: this.edgeData,
    };
    const options: vis.Options = {
      edges: {
        color: {
          color: '#808080',
          inherit: false,
        },
        width: 3,
      },
      nodes: {
        borderWidth: 1,
        color: {
          border: 'black',
        }
      }
    };

    // initialize your network!
    this.network = new vis.Network(el, data, options);
  }

  private fillGraph(nodes: number, minEdges: number, maxEdges: number) {
    this.nodes = [];
    for (let i = 0; i < nodes; i++) {
      this.nodes.push({
        id: i,
        label: ``,
        edgesIn: [],
        edgesOut: [],
      });
    }

    this.edges = [];
    while (true) {
      let idxFrom = this.selectMinNode(minEdges);
      if (idxFrom === -1) {
        break;
      }

      const idxTo = this.selectMaxNode(maxEdges);
      if (idxTo === -1) {
        break;
      }
      if (idxTo === idxFrom) {
        continue;
      }

      this.connectNodes(idxFrom, idxTo);
    }
  }

  private connectNodes(from: number, to: number) {
    const edge: Edge = {from, to};
    this.nodes[from].edgesOut.push(to);
    this.nodes[to].edgesIn.push(from);
    this.edges.push(edge);
  }

  private selectMaxNode(max: number): number {
    const nodeIndices: number[] = [];
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.edgesOut.length > max) {
        continue;
      }
      nodeIndices.push(i);
    }
    if (nodeIndices.length === 0) {
      return -1;
    }
    return nodeIndices[Math.floor(Math.random() * nodeIndices.length)];
  }

  private selectMinNode(min: number): number {
    const nodeIndices: number[] = [];
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.edgesOut.length > min) {
        continue;
      }
      nodeIndices.push(i);
    }
    if (nodeIndices.length === 0) {
      return -1;
    }
    return nodeIndices[Math.floor(Math.random() * nodeIndices.length)];
  }

}

function calculateClosenessCentrality(nodes: Node[], edges: Edge[], idx: number): number {
  const n = nodes.length;

  // Initialize distances array with infinity values
  const distances: number[] = new Array(n).fill(Infinity);
  distances[idx] = 0;

  // Breadth-First Search (BFS) to calculate shortest paths
  const queue: number[] = [idx];
  while (queue.length > 0) {
    const currentNodeIdx = queue.shift()!;
    const currentNode = nodes[currentNodeIdx];

    for (const edgeIdx of currentNode.edgesOut) {
      const edge = edges[edgeIdx];
      const neighborIdx = edge.to;
      if (distances[neighborIdx] === Infinity) {
        distances[neighborIdx] = distances[currentNodeIdx] + 1;
        queue.push(neighborIdx);
      }
    }
  }

  // Calculate closeness centrality
  const sumOfDistances = distances.reduce((acc, distance) => acc + distance, 0);
  const closenessCentrality = (n - 1) / sumOfDistances;

  return closenessCentrality;
}

function closenessCentrality(nodes: Node[], edges: Edge[], idx: number): number {
  const shortestPaths = bfs(nodes, edges, idx);
  const sumOfShortestPaths = shortestPaths.reduce((a, b) => a + (isFinite(b) ? b : 0), 0);
  return (nodes.length - 1) / sumOfShortestPaths;
}

function bfs(nodes: Node[], edges: Edge[], start: number): number[] {
  const distance = Array(nodes.length).fill(Infinity);
  distance[start] = 0;
  const queue: number[] = [start];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentNode = nodes[current];

    for (const next of currentNode.edgesOut) {
      if (distance[current] + 1 < distance[next]) {
        distance[next] = distance[current] + 1;
        queue.push(next);
      }
    }
  }
  return distance;
}

function betweennessCentrality(nodes: Node[], idx: number): number {
  let betweenness = Array(nodes.length).fill(0.0);

  for (let s = 0; s < nodes.length; s++) {
    let stack: number[] = [];
    let pred: number[][] = Array(nodes.length).fill([]);
    let sigma = Array(nodes.length).fill(0);
    sigma[s] = 1;
    let dist = Array(nodes.length).fill(-1);
    dist[s] = 0;

    let queue: number[] = [s];

    while (queue.length > 0) {
      let v = queue.shift()!;
      stack.push(v);

      for (let w of nodes[v].edgesOut) {
        // Path discovery
        if (dist[w] < 0) {
          queue.push(w);
          dist[w] = dist[v] + 1;
        }

        // Path counting
        if (dist[w] == dist[v] + 1) {
          sigma[w] += sigma[v];
          pred[w] = [...pred[w], v];
        }
      }
    }

    let delta = Array(nodes.length).fill(0.0);

    // Accumulation
    while (stack.length > 0) {
      let w = stack.pop()!;

      for (let v of pred[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w]);
        if (w !== s) {
          betweenness[w] += delta[w];
        }
      }

      delta[w] = 0;
    }
  }

  return betweenness[idx];
}

