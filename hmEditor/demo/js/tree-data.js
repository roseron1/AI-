/**
 * 文档树结构数据
 * 用于HM Editor Demo中的文档树管理
 */
const documentTreeData = [
    {
       id: 'medical_record',
       docName: '病案首页',
       type: 'folder',
       children: [{
           docCode: 'inpatient_record',
           docPath: 'file/inpatient_record.html',
           docName: '住院病案首页',
           recordName: '住院病案首页',
           type: 'file-edit',
           serialNumber:'001'
       }]
    },
    {
        id: 'admission_record',
        docName: '入院记录',
        type: 'folder',
        children: [{
                docCode: 'mcvnq6bu4r',
                docPath: 'file/admission_record.html',
                docName: '入院记录',
                recordName: '入院记录',
                type: 'file-edit',
                serialNumber:'001'
            },
            {
                docCode: 'md2j7iys4h',
                docPath: 'file/admission_24h.html',
                docName: '24小时内入出院记录',
                recordName: '24小时内入出院记录',
                type: 'file-edit',
                serialNumber:'001'
            },
            {
                docCode: 'md2j5ff3ra',
                docPath: 'file/admission_24h_death.html',
                docName: '24小时出入院死亡记录',
                recordName: '24小时出入院死亡记录',
                type: 'file-edit',
                serialNumber:'001'
            }
        ]
    },
    {
        id: 'progress_record',
        docName: '病程记录',
        type: 'folder',
        children: [{
                docCode: 'mcvomr3i80',
                docPath: 'file/first_progress.html',
                docName: '首次病程记录',
                recordName: '首次病程记录',
                type: 'file-edit',
                serialNumber:'001'
            },
            {
                docCode: 'mcvon2f6g6',
                docPath: 'file/daily_progress_1.html',
                docName: '日常病程记录',
                recordName: '日常病程记录',
                type: 'file-edit',
                serialNumber:'001'
            },
            {
                docCode: 'mcvoa64b2c',
                docPath: 'file/daily_progress_3.html',
                docName: '主治医生查房记录',
                recordName: '主治医生查房记录',
                type: 'file-edit',
                serialNumber:'001'
            },
            {
                docCode: 'mcvoa64b2c',
                docPath: 'file/daily_progress_4.html',
                docName: '主治医生首次查房记录',
                recordName: '主治医生首次查房记录',
                type: 'file-edit',
                serialNumber:'001'
            },
            {
                docCode: 'mcvoaxouei',
                docPath: 'file/daily_progress_5.html',
                docName: '会诊记录',
                recordName: '会诊记录',
                type: 'file-edit',
                serialNumber:'001'
            },
            {
                docCode: 'mcvtf7iarr',
                docPath: 'file/daily_progress_6.html',
                docName: '接班记录',
                recordName: '接班记录',
                type: 'file-edit',
                serialNumber:'001'
            },
            {
                docCode: 'md2j0r9nnp',
                docPath: 'file/daily_progress_7.html',
                docName: '阶段小结',
                recordName: '阶段小结',
                type: 'file-edit',
                serialNumber:'001'
            }
        ]
    },
    {
        id: 'surgery_record',
        docName: '手术记录',
        type: 'folder',
        children: [{
            docCode: 'md2j4of7k2',
            docPath: 'file/surgery_record.html',
            docName: '手术记录',
            recordName: '手术记录',
            type: 'file-edit',
            serialNumber:'001'
        },
        {
            docCode: 'md2j52nq4h',
            docPath: 'file/surgery_record_1.html',
            docName: '术前小结',
            recordName: '术前小结',
            type: 'file-edit',
            serialNumber:'001'
        }]
    },
    {
        id: 'discharge_record',
        docName: '出院记录',
        type: 'folder',
        children: [{
            docCode: 'mcvodv7qdh',
            docPath: 'file/discharge_record.html',
            docName: '出院记录',
            recordName: '出院记录',
            type: 'file-edit',
            serialNumber:'001'
        },{
            docCode: 'md2j5ff3ra',
            docPath: 'file/discharge_record_1.html',
            docName: '死亡记录',
            recordName: '死亡记录',
            type: 'file-edit',
            serialNumber:'001'
        },{
            docCode: 'md2kk093ne',
            docPath: 'file/discharge_record_2.html',
            docName: '死亡病例讨论记录',
            recordName: '死亡病例讨论记录',
            type: 'file-edit',
            serialNumber:'001'
        }]
    },
    {
        id: 'nursing_form',
        docName: '护理表单',
        type: 'folder',
        children: [{
            docCode: 'md2j4of7k3',
            docPath: 'file/nursing_form_1.html',
            docName: '一般护理记录单',
            recordName: '一般护理记录单',
            type: 'file-edit',
            serialNumber:'001'
        }]
    }
];
