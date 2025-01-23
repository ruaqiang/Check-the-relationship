app。vue
<template>
  <div class="layout">
    <div class="controls">
      <!-- 搜索关系主体 -->
      <div class="box">
    <h3 style="margin-left: 10px;">关系主体<button class="toggle-button" @click="toggleSearchbox">{{ SearchboxVisible ? '︿' : '﹀' }}</button></h3>
    <div class="search" v-show="SearchboxVisible">
      企业1:
      <div class="input-wrapper">
        <input
          v-model="name_1"
          type="text"
          placeholder="请输入企业名称"
          @input="querySearch(1, $event)"
          @blur="hideSuggestions(1)"
          @focus="showSuggestions(1)"
          ref="input1"
        />
        <img
          v-if="name_1"
          src="/favicon.ico"
          alt="删除"
          class="delete-icon"
          @click="clearInput(1)"
        />
      </div>
      <ul v-if="suggestions_1.length" class="dropdown" :style="{ width: inputWidth + 'px', left: input1Left + 'px' }">
        <li
          v-for="suggestion in suggestions_1"
          :key="suggestion.id"
          @click="handleSelectOne(suggestion)"
        >
          {{ suggestion.value }}
        </li>
      </ul>
      <br />
      企业2:
      <div class="input-wrapper">
        <input
          v-model="name_2"
          type="text"
          placeholder="请输入企业名称"
          @input="querySearch(2, $event)"
          @blur="hideSuggestions(2)"
          @focus="showSuggestions(2)"
          ref="input2"
        />
        <img
          v-if="name_2"
          src="/favicon.ico"
          alt="删除"
          class="delete-icon"
          @click="clearInput(2)"
        />
      </div>
      <ul v-if="suggestions_2.length" class="dropdown" :style="{ width: inputWidth + 'px', left: input2Left + 'px' }">
        <li
          v-for="suggestion in suggestions_2"
          :key="suggestion.id"
          @click="handleSelectTwo(suggestion)"
        >
          {{ suggestion.value }}
        </li>
      </ul>
    </div>

  </div>


      
      <div style="padding: 10px; background: white; margin-top: 20px; border-radius: 10px;">
    <div class="header">
      <h3>关系筛选<button class="toggle-button" @click="toggleFilters">{{ filtersVisible ? '︿' : '﹀' }}</button></h3>
    </div>
    <div v-show="filtersVisible">
      <div class="relationship-filters-container">
        <!-- 关系筛选部分 -->
        <div class="relationship-filters">
          <div class="relationship-filter-table">
            <div v-for="(row, rowIndex) in Math.ceil(filters.length / 3)" :key="rowIndex" class="relationship-filter-row">
              <div v-for="(filter, index) in getFiltersInRow(rowIndex)" :key="index" class="relationship-filter-cell">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    :value="filter.value" 
                    v-model="selectedFilters"
                  >
                  {{ filter.text }}
                </label>
              </div>
            </div>
          </div>
        </div>
        <!-- 关系层级进度条 -->
        <div class="relationship-level">
          <div class="level-label">
            <span>关系层数:</span>
            <input 
              type="range" 
              min="1" 
              max="5" 
              step="1" 
              v-model="relationshipLevel"
            />
            <span>{{ relationshipLevel }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>


      <!-- 关联路径 -->
      <div style="background: white;height: auto;margin-top: 20px;border-radius: 10px;">
        <h3 style="margin-left: 10px;">关联路径</h3>
        <div class="container">
    <div
      v-for="(path, index) in paths"
      :key="index"
      class="path-box"
      :class="{ selected: selectedPath === index }"
      @click="selectPath(index)"
    >
      <div class="path-header">
        <div class="path-number">{{ index + 1 }}</div>
        <div class="path-layer">{{ path.level }}</div>
        <div class="circle" :class="{ checked: selectedPath === index }"></div>
      </div>
      <div class="path-content">
        <div class="relation">
          <div v-for="(company, cIndex) in path.order" :key="cIndex" class="company-wrapper">
            <div class="company">{{ company }}</div>
            <div v-if="cIndex < path.order.length - 1" class="arrow-wrapper">
              <div v-for="relation in path.relations" :key="relation.id" class="arrow-container">
                <div v-if="relation.start === company && relation.end === path.order[cIndex + 1]">
                  <div class="arrow" :style="{ width: getArrowLength(relation) + 'px' }">
                    <!-- 正向箭头 -->
                    <svg :width="getArrowLength(relation) + 10" height="20">
                      <line x1="0" y1="10" :x2="getArrowLength(relation)" y2="10" stroke="black" />
                      <polygon :points="getArrowLength(relation) + ',5 ' + (getArrowLength(relation) + 5) + ',10 ' + getArrowLength(relation) + ',15'" fill="black" />
                    </svg>
                    <!-- 关系属性文本 -->
                    <span class="relation-attribute" :style="{ width: getArrowLength(relation) + 'px' }">{{ relation.detail }}</span>
                  </div>
                </div>
                <div v-if="relation.end === company && relation.start === path.order[cIndex + 1]">
                  <div class="arrow" :style="{ width: getArrowLength(relation) + 'px' }">
                    <!-- 反向箭头 -->
                    <svg :width="getArrowLength(relation) + 10" height="20">
                      <line x1="0" y1="10" :x2="getArrowLength(relation)" y2="10" stroke="black" />
                      <polygon points="5,5 0,10 5,15" fill="black" />
                    </svg>
                    <!-- 关系属性文本 -->
                    <span class="relation-attribute reverse" :style="{ width: getArrowLength(relation) + 'px' }">{{ relation.detail }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</div>

    <!-- ECharts图表 -->
    <div class="right-panel">
    <!-- <div style="width: 100%;height: 50px;background-color: yellow;"></div> -->
    <!-- 这里是父组件其他的 HTML -->
    <childComponent ref="childComponent" :nodes="Graphnodes" :links="Graphlinks" :Highlightnode="path.nodes" :Highlightlink="path.links" :id1="selectedIds.id1" :id2="selectedIds.id2" :paths="paths"/>
  </div>
    
  </div>
</template>


<script>
import axios from 'axios';
import childComponent from './chart.vue';

export default {

  components: {
    childComponent
  },

  data() {
    return {
      name_1: "",
      name_2: "",
      suggestions_1: [],
      suggestions_2: [],
      inputWidth: 0,
      input1Left: 0,
      input2Left: 0,
        Graphnodes: [],
        Graphlinks: [],
      selectedIds: {
        id1: null,
        id2: null,
      },

      selectedFilters: [], // 选中的关系筛选项
      filters: [
        { text: '实际控制人', value: "actual_control" },
        { text: '任职人员', value: "employee" },
        { text: '持股关系', value: "has_stake" },
        { text: '分支机构', value: "has_branch" },
        { text: '供应关系', value: "supplier" },
        { text: '怀疑相关', value: "suspected_related" },
        { text: '法定代表人', value: "legal_rep" },
        // { text: '共同申请专利', value: 8 },
        // { text: '相同电话号码', value: 9 },
        // { text: '相同注册地址', value: 10 },
        // { text: '相同经营地址', value: 11 }
      ],
      relationshipLevel: 5, // 初始关系层级
      filtersVisible: true, // 控制筛选项和进度条的显示/隐藏

      SearchboxVisible: true,// 控制搜索框的显示/隐藏


      path:[],
      selectedPath: null,
      paths: [
      ]
    };
  },
  mounted() {
    this.selectedFilters = this.filters.map(filter => filter.value);
    this.printCurrentState();

    this.setInputPositions();
    window.addEventListener('resize', this.setInputPositions);
  },


  beforeDestroy() {
    window.removeEventListener('resize', this.setInputPositions);
  },


  watch: {
    selectedFilters() {
      this.printCurrentState();
    },
    relationshipLevel() {
      this.printCurrentState();
    }
  },
  methods: {
    setInputPositions() {
      if (this.$refs.input1) {
        const rect1 = this.$refs.input1.getBoundingClientRect();
        this.input1Left = rect1.left - this.$el.getBoundingClientRect().left;
        this.inputWidth = rect1.width;
      }
      if (this.$refs.input2) {
        const rect2 = this.$refs.input2.getBoundingClientRect();
        this.input2Left = rect2.left - this.$el.getBoundingClientRect().left;
        this.inputWidth = rect2.width;
      }
    },
    querySearch(searchBox, event) {
      const queryString = event.target.value.trim();
      if (!queryString) {
        this.clearSuggestions(searchBox);
        return;
      }

      axios.get("/api/queryCompanyNameInfo", { params: { name: queryString } })
        .then(response => {
          const data = response.data.companyNameVOList.map(company => ({
            value: company.name,
            id: company.id
          }));
          if (searchBox === 1) {
            this.suggestions_1 = data;
          } else {
            this.suggestions_2 = data;
          }
        })
        .catch(() => this.clearSuggestions(searchBox));
    },
    handleSelectOne(item) {
      this.name_1 = item.value;
      this.selectedIds.id1 = item.id;
      this.suggestions_1 = [];
      console.log(this.selectedIds.id1);
      // 调用接口1，获取企业1的数据
      this.callApiWithIds();
    },
    handleSelectTwo(item) {
      this.name_2 = item.value;
      this.selectedIds.id2 = item.id;
      this.suggestions_2 = [];
      console.log(this.selectedIds.id2);
      // 调用接口2，获取企业2的数据
      this.callApiWithIds();
    },




    prepareDataToSend() {
    return {
    id1: this.selectedIds.id1,
    id2: this.selectedIds.id2,
    level: this.relationshipLevel,
    rlist: this.selectedFilters
    };
  },


    callApiWithIds() {
      const postData = this.prepareDataToSend();
  if (postData.id1 !=null && postData.id2 !=null) {
    this.fetchPaths();
    console.log('Sending request with data:', postData); // 添加调试信息
    axios.post("/api/NodeAndLink", postData, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
          .then(response => {
            // 直接将返回的nodes和links赋值给props对象
            this.Graphnodes=response.data.nodes,
            this.Graphlinks=response.data.links;
            console.log("Graphnodes内容:", this.Graphnodes);
            console.log("Graph  links内容:", this.Graphlinks);
          })
          .catch(error => {
            console.error("获取公司详情失败:", error);
          });
      }
    },
    showSuggestions(searchBox) {
      if (searchBox === 1) {
        this.suggestions_1 = [];
      } else {
        this.suggestions_2 = [];
      }
    },
    hideSuggestions(searchBox) {
      setTimeout(() => this.clearSuggestions(searchBox), 200);
    },
    clearSuggestions(searchBox) {
      if (searchBox === 1) {
        this.suggestions_1 = [];
      } else {
        this.suggestions_2 = [];
      }
    },
    clearInput(searchBox) {
      if (searchBox === 1) {
        this.name_1 = '';
        this.selectedIds.id1 = null;
        this.suggestions_1 = [];
        this.Graphnodes = [];
        this.Graphlinks = [];
        this.paths = [];
      } else {
        this.name_2 = '';
        this.selectedIds.id2 = null;
        this.suggestions_2 = [];
        this.Graphnodes = [];
        this.Graphlinks = [];
        this.paths = [];
      }
    },



    fetchPaths() {
      const postData = this.prepareDataToSend();
      axios.post("/api/CompanyPath", postData, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
        .then(response => {
          this.paths = response.data.paths; // 将后端返回的 paths 数据赋值给 paths 数组
          console.log('Fetched paths:', this.paths); // 打印获取到的 paths 数据
        })
        .catch(error => {
          console.error('Error fetching paths:', error);
        });
    },
    selectPath(index) {
  if (this.selectedPath === index) {
    // 如果已经选中，则取消选中
    this.selectedPath = null;
    this.path=[];
    console.log('Nodes:', this.path.nodes); // 打印nodes列表
    console.log('Links:', this.path.links); // 打印links列表
  } else {
    // 如果未选中，则选中该路径，并打印相关信息
    this.selectedPath = index;
    // 假设 this.paths 是一个包含路径数据的数组，每个路径是一个对象
    this.path = this.paths[index]; // 获取当前路径对象

    // 打印当前路径的nodes和links
    console.log('Nodes:', this.path.nodes); // 打印nodes列表
    console.log('Links:', this.path.links); // 打印links列表
    
  }
},
    getArrowLength(relation) {
      const lengthFactor = 12; // 每个字符增加的长度，根据实际情况调整
      const text = `${relation.detail}`.trim();
      return Math.max(text.length * lengthFactor, 40); // 确保最小长度为 40
    },

    //复选框函数
getFiltersInRow(rowIndex) {
      const start = rowIndex * 3;
      const end = Math.min(start + 3, this.filters.length);
      return this.filters.slice(start, end);
    },
    toggleFilters() {
      this.filtersVisible = !this.filtersVisible;
    },
    toggleSearchbox() {
      this.SearchboxVisible = !this.SearchboxVisible;
    },
    printCurrentState() {
      console.log("Selected Filters:", this.selectedFilters);
      console.log("Relationship Level:", this.relationshipLevel);
      //监听之后查询
      this.callApiWithIds();
    }
  }
};
</script>
