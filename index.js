const parseString = require('xml2js').parseString;
const fs = require('fs');
const argv = require('optimist').argv;

if(!argv.i || !argv.o || !argv.n)throw Error('参数为空');

fs.readFile(argv.i, 'utf8' , (err, xmlData) => {
  parseString(xmlData,(err2,res)=>{
    let element;
    let componentArr = [];
    for (let i = 0; i < Object.keys(res).length; i++) {
      if(Object.keys(res)[i].indexOf('doc:iso') > -1){
        element = res[Object.keys(res)[i]];
      }
    }
    const uosObj = element['ifc:uos'];
    const allComponent = uosObj[0]['IfcRelContainedInSpatialStructure'];
    for (let i = 0; i < allComponent.length; i++) {
      const obj = allComponent[i]["RelatedElements"][0];
      for (let i2 = 0; i2 < Object.keys(obj).length; i2++) {
        const obj2 = Object.keys(obj)[i2];
        if(obj2 === '$') continue;
        for (let i3 = 0; i3 < obj[obj2].length; i3++) {
          const obj3 = obj[obj2][i3];
          const refStr = obj3["$"]['ref'];
          let findObj = null;
          let currentType = '';
          if(!findObj){
            findObj = uosObj[0]['IfcPipeFitting'] && uosObj[0]['IfcPipeFitting'].find((r)=>r['$']['id'] === refStr);
            currentType = 'IfcPipeFittingType';
          }
          if(!findObj){
            findObj = uosObj[0]['IfcPipeSegment'] && uosObj[0]['IfcPipeSegment'].find((r)=>r['$']['id'] === refStr);
            currentType = 'IfcPipeSegmentType';
          }
          if(!findObj){
            findObj = uosObj[0]['IfcWall'] && uosObj[0]['IfcWall'].find((r)=>r['$']['id'] === refStr);
            currentType = 'IfcWallType';
          }
          if(!findObj){
            findObj = uosObj[0]['IfcFlowTerminal'] && uosObj[0]['IfcFlowTerminal'].find((r)=>r['$']['id'] === refStr);
            currentType = 'IfcFlowTerminalType';
          }
          if(!findObj){
            findObj = uosObj[0]['IfcFlowSegment'] && uosObj[0]['IfcFlowSegment'].find((r)=>r['$']['id'] === refStr);
            currentType = 'IfcFlowSegmentType';
          }
          if(!findObj){
            findObj = uosObj[0]['IfcFlowFitting'] && uosObj[0]['IfcFlowFitting'].find((r)=>r['$']['id'] === refStr);
            currentType = 'IfcFlowFittingType';
          }
          findObj && componentArr.push({
            ref: refStr,
            name: findObj['Name'][0],
            objectType: findObj['ObjectType'][0].split(':')[0],
            properties: [],
            typeData:[],
            globalId: findObj['GlobalId'][0],
            currentType
          });
        }
      }
    }

    const allTypes = uosObj[0]['IfcRelDefinesByType'];
    for (let i = 0; i < componentArr.length; i++) {
      const item = componentArr[i];
      let findIndex = -1;
      for (let i2 = 0; i2 < allTypes.length; i2++) {
        const item2 = allTypes[i2];
        item2['RelatedObjects'].map((r)=>{
          Object.keys(r).map((r2)=>{
            let findObj = null;
            if(r2 === '$') return;
            !findObj && (findObj = r[r2].find((r3)=>r3['$']['ref'] === item.ref ) )
            findObj && (findIndex = i2);
          })
        })
      }
      if(findIndex > -1){
        for (let i2 = 0; i2 < allTypes[findIndex]['RelatingType'].length; i2++) {
          const item2 = allTypes[findIndex]['RelatingType'][i2];
          Object.keys(item2).map((r)=>{
            const typeArr = item2[r];
            for (let i3 = 0; i3 < typeArr.length; i3++) {
              const typeRefItem = typeArr[i3]['$'];
              if(!componentArr[findIndex]) continue;
              const currentTypeObj = uosObj[0][componentArr[findIndex]['currentType']];
              if(!currentTypeObj) continue;
              for (let i4 = 0; i4 < currentTypeObj.length; i4++) {
                const currentTypeHasPropertySets = currentTypeObj[i4]['HasPropertySets'];
                for (let i5 = 0; i5 < currentTypeHasPropertySets.length; i5++) {
                  const setsArr = currentTypeHasPropertySets[i5];
                  let customDataArr = [];
                  for (let i6 = 0; i6 < uosObj[0]['IfcRelDefinesByProperties'].length; i6++) {
                    const element = uosObj[0]['IfcRelDefinesByProperties'][i6];
                    Object.keys(element['RelatedObjects'][0]).map((r)=>{
                      if(r !== '$'){
                        if(element['RelatedObjects'][0][r][0]['$']['ref'] === componentArr[findIndex]['ref']){
                          for (let i7 = 0; i7 < element['RelatingPropertyDefinition'].length; i7++) {
                            const element2 = element['RelatingPropertyDefinition'][i7];
                            for (let i8 = 0; i8 < element2['IfcPropertySet'].length; i8++) {
                              const element3 = element2['IfcPropertySet'][i8];
                              for (let i9 = 0; i9 < uosObj[0]['IfcPropertySet'].length; i9++) {
                                const element4 = uosObj[0]['IfcPropertySet'][i9];
                                if(element3['$']['ref'] === element4['$']['id']){
                                  for (let i10 = 0; i10 < element4['HasProperties'][0]['IfcPropertySingleValue'].length; i10++) {
                                    const element5 = element4['HasProperties'][0]['IfcPropertySingleValue'][i10];
                                    customDataArr.push(element5['$']['ref']) //节约几次循环 放到下面去了 不然又要遍历属性集合拿模型属性
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    })
                  }
                  customDataArr = Array.from(new Set(customDataArr));
                  for (let i6 = 0; i6 < setsArr['IfcPropertySet'].length; i6++) {
                    const innerProperties = setsArr['IfcPropertySet'][i6]['HasProperties'][0];
                    const ifcPropertySingleValue = innerProperties['IfcPropertySingleValue'];
                    for (let i7 = 0; i7 < ifcPropertySingleValue.length; i7++) {
                      const itemProperty = ifcPropertySingleValue[i7];
                      if(itemProperty['$']['xsi:nil'] === 'true'){
                        //引用属性
                        for (let i8 = 0; i8 < uosObj[0]['IfcPropertySingleValue'].length; i8++) {
                          const itemValue = uosObj[0]['IfcPropertySingleValue'][i8];
                          for (let i9 = 0; i9 < customDataArr.length; i9++) {
                            const customItem = customDataArr[i9];
                            if(itemValue['$']['id'] === customItem){
                              if(itemValue['NominalValue'][0]['IfcText-wrapper']){
                                componentArr[findIndex].properties.push({
                                  key:itemValue['Name'][0],
                                  value: itemValue['NominalValue'][0]['IfcText-wrapper'][0]
                                })
                              }
                              if(itemValue['NominalValue'][0]['IfcLengthMeasure-wrapper']){
                                componentArr[findIndex].properties.push({
                                  key:itemValue['Name'][0],
                                  value: itemValue['NominalValue'][0]['IfcLengthMeasure-wrapper'][0]
                                })
                              }
                            }
                          }
                          if(itemValue['$']['id'] === itemProperty['$']['ref']){
                            if(itemValue['NominalValue'][0]['IfcText-wrapper']){
                              componentArr[findIndex].typeData.push({
                                key:itemValue['Name'][0],
                                value: itemValue['NominalValue'][0]['IfcText-wrapper'][0]
                              })
                            }
                          }
                        }
                      }else{
                        //面板属性
                        if(itemProperty['NominalValue'][0]['IfcText-wrapper']){
                          componentArr[findIndex].typeData.push({
                            key:itemProperty['Name'][0],
                            value: itemProperty['NominalValue'][0]['IfcText-wrapper'][0]
                          })
                        }
                      }
                    }
                  }
                }
              }
            }
          })
        }
      }
    }
    for (let i = 0; i < componentArr.length; i++) {
      const item = componentArr[i];
      for (let i2 = 0; i2 < item['properties'].length; i2++) {
        for(var j = i2+1; j < item['properties'].length; j++){
          if(item['properties'][i2].key === item['properties'][j].key){
            item['properties'].splice(j,1);
              j--;
          }
        }
      }
    }
    fs.writeFile(`${argv.o}/${argv.n}.json`, JSON.stringify(componentArr,null,2), err => {
      if (err) {
        console.error(err)
        return
      }
    })
  })
});
