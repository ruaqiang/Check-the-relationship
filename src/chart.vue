<template>

  <div style="width: 100%;height: 100%;align-items: right;" class="right-panel"  ref="rightPanel">
    <div class="zoom-button">
      <button @click="resetNodesAndLinks" class="reset-btn">
        重置图像
      </button>
      <button  @click="download" class="download-btn">
        <img class="button-icon" src="./bottom.png" alt="下载"/>
      </button>
      <button @click="toggleFullscreen">Enter Fullscreen</button>
    </div>
      <v-chart ref="chartRef" class="chart" :option="option" autoresize id="myChart" @click="handleNodeClick"/>
  </div>
</template>

<script setup>
import html2canvas from "html2canvas"
import { use } from 'echarts/core';
import axios from 'axios';
import { CanvasRenderer } from 'echarts/renderers';
import { GraphChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import { ref, reactive,computed,watchEffect,defineProps,onMounted,watch,nextTick,onBeforeUnmount } from 'vue';

use([
  CanvasRenderer,
  GraphChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
]);

const color=[]

const props=defineProps({
  nodes:{
    type:Array,
    default:[]
  },
  links:{
    type:Array,
    default:[]
  },
  Highlightnode:{
    type:Array,
    default:[]
  },
  Highlightlink:{
    type:Array,
    default:[]
  },
  id1:{},
  id2:{},
  paths:{
    type:Array,
    default:[]
  }
})


const chartRef = ref(null);//引用ECharts图表实例
let myChart = null;
const tooltipContent = ref(''); // 存储 tooltip 显示内容的响应式变量
const numCols = 5; // 固定列数为4
const gridSpacing = 200; // 网格间距
// 假定的网格布局参数
const gridRows = 3;            // 网格的行数
const gridCols = 6;            // 网格的列数
const gridSpacingX = 800 / 6;  // 网格列间距，基于画布宽度划分六列
const gridSpacingY = 600 / 3;  // 网格行间距，基于画布高度划分三行

const initGraphData = () => {
  // 当 props.links 为空时，不做任何处理
  if (!props.links || props.links.length === 0) {
    console.log(props.nodes);
    return {
      nodes: [],
      links: []
    };
  }

  // 分离出特殊节点和普通节点
  const specialNodes = props.nodes.filter(node => node.id === props.id1 || node.id === props.id2);
  const normalNodes = props.nodes.filter(node => node.id !== props.id1 && node.id !== props.id2);

  // 特殊节点的固定 y 坐标
  const specialTopNodeY = gridSpacingY / 2;    // 顶部特殊节点
  const specialBottomNodeY = gridSpacingY * 3.5; // 底部特殊节点

  // 特殊节点的位置
  specialNodes.forEach(node => {
    node.x = 1000 / 2; // 特殊节点在中间
    node.y = node.id === props.id1 ? specialTopNodeY : specialBottomNodeY;
  });

  // 普通节点布局配置，考虑特殊节点的位置
  // 调整第一行普通节点的起始 y 坐标，确保不与特殊节点重合
  const normalNodesStartY = specialTopNodeY + gridSpacingY;
  const normalNodesEndY = specialBottomNodeY - gridSpacingY;

  const totalNormalNodesRows = Math.min(Math.ceil(normalNodes.length / gridCols), gridRows); // 最大3行

  // 根据实际行数动态计算普通节点的行间距
  const normalNodeSpacingY = totalNormalNodesRows > 1 ? (normalNodesEndY - normalNodesStartY) / (totalNormalNodesRows - 1) : 0;

  // 分配普通节点位置
  normalNodes.forEach((node, index) => {
    // 行索引
    const rowIndex = Math.floor(index / gridCols);

    // 当前行普通节点数量，用于计算横向间距并实现居中
    const nodesInCurrentRow = rowIndex === totalNormalNodesRows - 1 ? normalNodes.length - rowIndex * gridCols : gridCols;
    // 计算当前行普通节点的横向间距
    const gridSpacingX = 1000 / (nodesInCurrentRow + 1);

    node.x = (index % gridCols + 1) * gridSpacingX; // x坐标，居中对齐
    node.y = rowIndex === 0 ? 
      normalNodesStartY : 
      normalNodesStartY + normalNodeSpacingY * rowIndex; // y坐标，加上调整过的起始 y 值
  });

  // 合并特殊节点和普通节点数组
  return {
    nodes: [...specialNodes, ...normalNodes],
    links: props.links
  };
};


// 初始赋值
const graphData = reactive(initGraphData());

// 监听传入的 props.nodes 和 props.links 是否发生变化
watch([() => props.nodes, () => props.links], (newValues, oldValues) => {
  const [newNodes, newLinks] = newValues;
  // 当 links 为空时，使用 initGraphData 重置 nodes 位置，否则使用传入的节点和链接
  if (!newLinks || newLinks.length === 0) {
    // 如果没有链接数据，重置 nodes 到初始布局位置
    graphData.nodes = props.nodes.map((node, index) => ({
      ...node,
      x: (index % numCols) * gridSpacing + gridSpacing / 2,
      y: Math.floor(index / numCols) * gridSpacing + gridSpacing / 2,
      // 如果有其他属性需要重置，也要在这里设置
    }));
    graphData.links = []; // 清空 links
  } else {
    // 如果 links 不为空，直接更新 nodes 和 links 数据
    graphData.nodes = initGraphData().nodes;
    graphData.links = newLinks;
  }

  // 通过 nextTick 确保计算属性 processedData 和 processedLinks 已经更新
  nextTick(() => {
    const newOption = {
      ...option.value, // 使用现有的配置
      series: [{
        ...option.value.series[0],
        data: processedData.value, // 使用计算后的节点数据
        links: processedLinks.value // 使用计算后的链接数据
      }]
    };
  
    // 对图表实例使用新的选项
    if (chartRef.value) {
      chartRef.value.setOption(newOption, { notMerge: true }); // 使用不合并配置，完全重置
    }
  });
}, { deep: true });

// 初始化 ECharts 实例
onMounted(async () => {
  nextTick(() => {
    const chartDom = document.getElementById('myChart');
    myChart.value = echarts.init(chartDom); // 初始化并存储到 ref 中
    myChart.value.setOption(option.value); // 设置图表配置
    myChart.on('click', function (params) {
    console.log(params);
    console.log(params.data);   //获取点击柱状图的第几个柱子 是从0开始的哦
});
  })
});

// 监听 Highlightnode 和 Highlightlink 的变化
watch(() => props.Highlightnode, (newValue,oldValue) => {
  console.log('Highlightnode value changed to', newValue);
});
watch(() => props.Highlightlink, (newValue) => {
  console.log('Highlightlink value changed to', newValue);
});
watch(() => props.paths, (newValue) => {
  console.log('paths value changed to', newValue);
});

// 计算属性来处理节点数据
const processedData = computed(() => {
  const highlightNotEmpty = props.Highlightnode.length > 0;
  return graphData.nodes.map(node => {
    let nodeStyle = {};
    const c= getCompanyCategory(node, props);
    
    if (highlightNotEmpty) {
      // 如果 Highlightnode 不为空，先将所有节点样式变淡
      nodeStyle = {
        opacity: 0.2,
      };
      
      // 处理 Company 类型的节点
      if (node.category === 'Company'||node.category==='SpecialCompany') {
        const newParam = `cid${node.id}`;
        if (props.Highlightnode.includes(newParam)) {
          nodeStyle = {
            opacity: 1,
            borderWidth: 3,
          };
        }
      }
      if (node.category === 'Person') {
        const newParam = `pid${node.id}`;
        if (props.Highlightnode.includes(newParam)) {
          nodeStyle = {
            opacity: 1,
            borderWidth: 3,
          };
        }
      }
      // 处理其他类型的节点逻辑，如果需要
    } else {
      // 如果 Highlightnode 为空，正常显示所有节点
      nodeStyle = {
        opacity: 1,
      };
    }

    return {
      ...node,
      itemStyle: nodeStyle,
      fixed: true, // 根据需要决定是否固定位置
      category:c
    };
  })});
const processedLinks = computed(() => {
  if (!props.links || props.links.length === 0) {
    // 如果链接数组为空，则直接返回空数组
    return [];
  }

  const highlightLinkNotEmpty = props.Highlightlink.length > 0;

  // 创建一个 Map 来记录每对节点之间的边的标签数组
  const duplicateLinkLabels = new Map();
  const linkPairs = new Map(); // 用于计算曲率

  // 先遍历一遍所有的边，来收集和合并具有相同起点和终点的边的标签
  props.links.forEach(link => {
    const orderedPairKey = `${link.source}-${link.target}`;
    
    if (!duplicateLinkLabels.has(orderedPairKey)) {
      duplicateLinkLabels.set(orderedPairKey, []);
    }
    
    duplicateLinkLabels.get(orderedPairKey).push(link.label || '');

    // 记录边的数量以计算曲率
    const unorderedPairKey = [link.source, link.target].sort().join('-');
    const count = linkPairs.get(unorderedPairKey) || 0;
    linkPairs.set(unorderedPairKey, count + 1);
  });

  // 根据之前收集的标签信息来创建最终边的对象
  return props.links.map(link => {
    let linkStyle = {};

    if (highlightLinkNotEmpty) {
      // 高亮逻辑
      linkStyle.opacity = 0.1; // 默认不高亮的边降低透明度
      if (props.Highlightlink.includes(link.id.toString())) {
        linkStyle = { opacity: 1, width: 3 }; // 高亮显示的边
      }
    }

    // 计算曲率
    const unorderedPairKey = [link.source, link.target].sort().join('-');
    const isDoubleDirection = linkPairs.get(unorderedPairKey) > 1;
    let curveness = 0;

    if (isDoubleDirection) {
      curveness = link.source < link.target ? 0.2 : 0.2;
    }

    // 检查是否有重复边来合并标签
    const orderedPairKey = `${link.source}-${link.target}`;
    const labelsToDisplay = duplicateLinkLabels.has(orderedPairKey) ?
                            duplicateLinkLabels.get(orderedPairKey).join(', ') :
                            link.label; // 如果没有重复仅显示当前标签

    return {
      ...link,
      lineStyle: { ...linkStyle, curveness },
      source: link.source.toString(),
      target: link.target.toString(),
      label: {
        show: true,
        formatter: labelsToDisplay // 显示合并后的边上的文本
      }
    };
  });
});
var label=reactive('');
// 用于格式化 tooltip 的函数
function formatter(params) {
  if (params.dataType === 'node') {
    // 根据节点的类别显示不同信息
    const baseInfoUrl = ''; // 修改为实际的信息页面的基础 URL
    // 定义超链接的样式。样式可根据你的需求进行定制
    const linkStyle = 'text-decoration: none; color: #3eaf7c; font-weight: bold;';

    switch (params.data.category) {
      case 'Company':
        axios.post('/api/queryCompanyById?id='+params.data.id)
        .then(response=>{
          const re=response.data.companyData[0];
          label=`公司名称：${re.name}<br>法人：${re.legal_rep}<br>注册资本：${re.register}<br>成立日期：${re.start_data}<br>`+
          `<a href="" target="_blank" style="${linkStyle}">查看企业详情</a>`;
        });
        return label;
      case 'SpecialCompany':
        axios.post('/api/queryCompanyById?id='+params.data.id)
        .then(response=>{
          const re=response.data.companyData[0];
          label=`公司名称：${re.name}<br>法人：${re.legal_rep}<br>注册资本：${re.register}<br>成立日期：${re.start_data}<br>`+
          `<a href="" target="_blank" style="${linkStyle}">查看企业详情</a>`;
        });
        return label;
      case 'Person':
      axios.post('/api/findPersonByName?id='+params.data.id)
        .then(response=>{
          const re=response.data.personData[0];
          label=`自然人名称：${re.name}<br>`+
          `担任法人的企业数量：${re.num_1} 家<br>`+
          `对外投资的企业数量：${re.num_2} 家<br>`+
          `对外任职的企业数量：${re.num_3} 家<br>`+
          `<a href="" target="_blank" style="${linkStyle}">查看人物详情</a>`;
        });
        return label;
      default: 
        return params.data.name; // 默认显示节点名称
    }
  }
  return ''; // 如果没有匹配的数据类型，不显示tooltip
}

const option = ref({});
// 使用watchEffect监听graphData和processedData的变化，然后更新option
watchEffect(() => {
  option.value = {
  //... ECharts option
  title: {
    
  },
  dataZoom:[{
    type: 'inside',
    minSpan: 10,  // 最小缩放比例为数据总量的10%
    maxSpan: 100, // 最大缩放比例为数据总量的100%
    // ...
  }],

  grid:{
        left: '50%',   // 与容器左侧的距离
         right: '5%', // 与容器右侧的距离
         top: '5%',   // 与容器顶部的距离
         bottom: '5%', // 与容器底部的距离
      },

  tooltip: {
    show:true,
    enterable: true ,
    formatter: formatter
  },
  legend:{
    align:'left',
    itemWidth:40,//图例宽度
    itemHeight:20,//图例高度
    itemGap:19,
    // 自定义图例文本
    formatter: function (name) {
        // 这里可以添加自定义的文本格式化逻辑
        if (name === 'Company') {
          return '关键路径上的企业'; // 如果原始文本是 'Company'，图例显示为 '公司'
        } else if (name === 'Person') {
          return '关键路径上的自然人'; // 如果原始文本是 'Person'，图例显示为 '个人'
        }else if (name === 'SpecialCompany') {
          return '目标企业'; 
        }
      },
      left:20,
      bottom:5,
      selectedMode:false
  },
  series: [
    {
      type: 'graph',
      layout: 'none',
      symbolSize: 60,
      scaleLimit:{
        max:1.2,
        min:0.8
      },
      roam:true,
      draggable: true,//允许用户拖拽节点
      label:{
        show:true,
        width: 100, // 实际需要根据节点大小设置合适的值
        overflow: 'break', // 溢出换行
        align: 'center', // 文本居中对齐
        verticalAlign: 'middle', // 文本垂直居中对齐
      },
      edgeSymbol: ['circle', 'arrow'],
      edgeSymbolSize: [4, 20],
      symbolOffset:[0,0],
      edgeLabel: {
        show: true,
        fontSize: 12
      },
      force: {
        repulsion: 600,
        edgeLength: [100, 300]
      },
      itemStyle: {
      // 正常状态下节点的样式
      normal: {
        // ...
      },
      // 高亮(悬浮)状态下节点的样式
      emphasis: {
          focus: 'adjacency',
          blurScope: 'coordinateSystem',
          lineStyle: {
            width: 10
          }
        }
    },
      
      // 节点数据
      data: processedData,
      links:processedLinks,
      categories: [
      {
        name:'SpecialCompany',
        symbol:'roundRect',
        itemStyle: {
              color: '#475f6e', // 节点填充颜色
              borderColor: '#60cfe6', // 边框颜色
              borderWidth: 2, // 边框宽度
              borderType: 'solid',
              borderRadius: 20, // 圆角大小
            },
            symbolSize: [100, 80],
            label: {
              width: 80, // 根据节点的实际大小进行调整
              overflow: 'break'
            }
        },
        { name: 'Company',
        symbol:'roundRect',
        itemStyle: {
              color: 'white', // 节点填充颜色
              borderColor: '#60cfe6', // 边框颜色
              borderWidth: 2, // 边框宽度
              borderType: 'solid',
              borderRadius: 20, // 圆角大小
            },
            symbolSize: [100, 80],
            label: {
              width: 80, // 根据节点的实际大小进行调整
              overflow: 'break'
            }
        },
        { name: 'Person' },
      ]
    }
  ],
}});


// 定义一个辅助函数来根据节点信息和 props 确定节点的类别
function getCompanyCategory(node, props) {
  // 如果节点类别是 'Company' 并且 id 匹配特殊样式的 id，则使用 'SpecialCompany' 类别
  if (node.category === 'Company' && (node.id === props.id1 || node.id === props.id2)) {
    return 'SpecialCompany';
  }
  // 否则返回节点原有的类别
  return node.category;
}

// 导出多张图表为一张图片
// dmo元素里的内容转换为canvas,并将canvas下载为图片
const download = () => {//目前Chrome不能运行下载
  // 转换成canvas
  html2canvas(document.getElementById("myChart"),).then(function (canvas) {
    var img = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    // 创建a标签，实现下载
    var creatIMg = document.createElement("a");
    creatIMg.download = "图表.png"; // 设置下载的文件名，
    creatIMg.href = img; // 下载url
    document.body.appendChild(creatIMg);
    creatIMg.click();
    creatIMg.remove(); // 下载之后把创建的元素删除
  });
};

function resetNodesAndLinks() {//重置图像

  const newOption = {
      ...option.value, // 使用现有的配置
      series: [{
        ...option.value.series[0],
        data: processedData.value, // 使用计算后的节点数据
        links: processedLinks.value // 使用计算后的链接数据
      }]
    };
  if (chartRef.value) {
      chartRef.value.setOption(newOption, { notMerge: true }); // 使用不合并配置，完全重置
    }
}

const isFullscreen = ref(false);
const rightPanel = ref(null);
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  const panel = rightPanel.value;
  if (isFullscreen.value) {
    panel.classList.add('fullscreen');
    document.documentElement.requestFullscreen();
  } else {
    panel.classList.remove('fullscreen');
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }
}

function onFullscreenChange() {
  nextTick(() => {
    if (document.fullscreenElement === null) {
      isFullscreen.value = false;
      rightPanel.value.classList.remove('fullscreen');
    }
  });
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange);
});

onBeforeUnmount(()=> {
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});

function handleNodeClick(event) {
  console.log('success')
  if (event.dataType === 'node') {
    const node = event.data;
    let nodeIdWithPrefix;

    if (node.category === 'Company' || node.category === 'SpecialCompany') {
      nodeIdWithPrefix = `cid${node.id}`;
    } else if (node.category === 'Person') {
      nodeIdWithPrefix = `pid${node.id}`;
    }
    console.log(nodeIdWithPrefix)
    console.log(JSON.stringify(props.paths[0].nodes))
    if (nodeIdWithPrefix) {
      const matchedPaths = props.paths.filter(paths => paths[0].node.includes(nodeIdWithPrefix));
      console.log('Matched paths:', matchedPaths);
      // 这里可以对 matchedPaths 进行进一步处理，例如高亮显示相关路径
    }
  }
}

</script>

<style scoped>
/* 图例容器样式 */
.legend {
  display: flex;
  justify-content: center; /* 水平居中 */
  padding: 10px;
  gap: 20px; /* 图例间隔 */
}

/* 图例项样式 */
.legend-item {
  display: flex;
  align-items: center; /* 垂直居中 */
  gap: 5px; /* 图标和文本间隔 */
}

/* 图例图标样式 */
.legend-icon {
  width: 20px; /* 图标宽度 */
  height: 14px; /* 图标高度 */
  border-radius: 20%; /* 圆形图标 */
  display: inline-block;
  border-color: black;
  border-width: 3px;
}

/* 图例文本样式 */
.legend-text {
  font-size: 12px;
  color: #333;
}

.zoom-button {
  position: absolute; /* 绝对定位相对于 .chart-container */
  top: 10px; /* 与容器顶部的距离 */
  right: 10px; /* 与容器右侧的距离 */
  z-index: 10; /* 足够高的 z-index 确保按钮显示在图表之上 */
  height: 20px; /* 设置图片的高度 */
  width: auto;  /* 设置图片的宽度保持比例 */
}

</style>